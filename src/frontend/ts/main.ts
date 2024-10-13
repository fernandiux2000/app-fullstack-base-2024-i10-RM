/**
 * Clase principal que implementa el manejo de eventos para la gestión de dispositivos en la UI.
 */
class Main implements EventListenerObject {
    constructor() {
        let btnBuscar = this.recuperarElemento<HTMLButtonElement>("btnBuscar");
        let btnNuevo = this.recuperarElemento<HTMLButtonElement>("btnNuevo");
        let btnGuardarDispositivo = this.recuperarElemento<HTMLButtonElement>("btnGuardarDispositivo");
        let btnEliminar = this.recuperarElemento<HTMLButtonElement>("btnEliminar");
        let btnEditar = this.recuperarElemento<HTMLButtonElement>("btnEditar");
        let btnGuardarEdicion = this.recuperarElemento<HTMLButtonElement>("btnGuardarEdicion");

        // Asignar eventos a los botones
        btnBuscar.addEventListener('click', this);
        btnNuevo.addEventListener('click', this);
        btnGuardarDispositivo.addEventListener('click', this);
        btnEliminar.addEventListener('click', this);
        btnEditar.addEventListener('click', this);
        btnGuardarEdicion.addEventListener('click', this.guardarEdicionDispositivo.bind(this));
    }

    /**
     * Maneja eventos de click en los botones principales.
     */
    handleEvent(object: Event): void {
        let idDelElemento = (<HTMLElement>object.target).id;
        switch (idDelElemento) {
            case 'btnBuscar':
                this.buscarDevices();
                break;
            case 'btnNuevo':
                this.mostrarFormularioNuevoDispositivo();
                break;
            case 'btnGuardarDispositivo':
                this.confirmarGuardarNuevoDispositivo(); // Confirmar antes de guardar
                break;
            case 'btnEliminar':
                this.eliminarDispositivosSeleccionados();
                break;
            case 'btnEditar':
                this.mostrarFormularioEditarDispositivo();
                break;
        }
    }

    /**
     * Realiza una solicitud GET para obtener los dispositivos desde el servidor.
     */
    private buscarDevices(): void {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                this.mostrarDevices(xmlHttp.responseText);
                this.ocultarFormularioNuevoDispositivo();
            } else if (xmlHttp.readyState == 4) {
                console.error("Error al cargar dispositivos:", xmlHttp.status, xmlHttp.statusText);
            }
        };
        xmlHttp.open("GET", "http://localhost:8000/devices", true);
        xmlHttp.send();
    }

    /**
     * Muestra los dispositivos en el contenedor grid.
     * @param responseText JSON con la lista de dispositivos.
     */
    private mostrarDevices(responseText: string): void {
        let gridContainer = this.recuperarElemento<HTMLElement>("grid-container");
        gridContainer.innerHTML = '';

        let lista: Array<Device> = JSON.parse(responseText);
        if (!lista || lista.length === 0) {
            console.warn("No se encontraron dispositivos en la base de datos.");
            return;
        }

        lista.forEach((item) => {
            let imagePath = this.obtenerImagenPorTipo(item.type);
            let card = `
            <div class="card">
                <div class="checkbox-container">
                    <label>
                        <input type="checkbox" class="filled-in checkbox-card" id="chk_${item.id}" idBd="${item.id}"/>
                        <span></span>
                    </label>
                </div>
                <div class="card-image">
                    <img src="./static/images/${imagePath}" alt="Imagen de dispositivo" onerror="this.src='./static/images/default.png';">
                </div>
                <div class="card-content">
                    <span class="card-title" id="nombre_${item.id}">${item.name}</span>
                    <p id="descripcion_${item.id}">${item.description}</p>
                    <div class="switch">
                        <label>
                            Off
                            <input idBd="${item.id}" id="cb_${item.id}" type="checkbox" ${item.state ? 'checked' : ''}>
                            <span class="lever"></span>
                            On
                        </label>
                    </div>
                </div>
            </div>`;
            gridContainer.innerHTML += card;
        });

        this.agregarEventosCheckbox();
        this.agregarEventosSwitch();
    }

    /**
     * Agrega eventos de cambio a los checkboxes de los dispositivos.
     */
    private agregarEventosCheckbox(): void {
        let checkboxes = document.querySelectorAll('.checkbox-card');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => this.verificarSeleccion());
        });
    }

    /**
     * Verifica la selección de dispositivos para habilitar o deshabilitar botones de acción.
     */
    private verificarSeleccion(): void {
        let checkboxes = document.querySelectorAll('.checkbox-card:checked');
        let btnEliminar = this.recuperarElemento<HTMLButtonElement>('btnEliminar');
        let btnEditar = this.recuperarElemento<HTMLButtonElement>('btnEditar');

        btnEliminar.disabled = checkboxes.length === 0;
        btnEditar.disabled = checkboxes.length !== 1;
        btnEliminar.classList.toggle('disabled', checkboxes.length === 0);
        btnEditar.classList.toggle('disabled', checkboxes.length !== 1);
    }

    /**
     * Agrega eventos a los switches para cambiar el estado de los dispositivos.
     */
    private agregarEventosSwitch(): void {
        let switches = document.querySelectorAll('.switch input[type="checkbox"]');
        switches.forEach((switchElement) => {
            switchElement.addEventListener('change', (e) => {
                let checkbox = e.target as HTMLInputElement;
                let deviceId = checkbox.getAttribute('idBd');
                this.toggleDeviceState(checkbox, deviceId);
            });
        });
    }

    /**
     * Cambia el estado de un dispositivo (on/off).
     */
    private toggleDeviceState(checkbox: HTMLInputElement, deviceId: string | null): void {
        if (!deviceId) return;

        let newState = checkbox.checked ? 1 : 0;
        let updateData = { state: newState };

        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open("PUT", `http://localhost:8000/devices/${deviceId}/state`, true);
        xmlHttp.setRequestHeader("Content-Type", "application/json");
        xmlHttp.send(JSON.stringify(updateData));

        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.readyState == 4 && xmlHttp.status === 200) {
                console.log(`Estado del dispositivo con ID ${deviceId} cambiado a ${newState}`);
            } else if (xmlHttp.readyState == 4) {
                console.error("Error al cambiar el estado del dispositivo:", xmlHttp.status, xmlHttp.statusText);
            }
        };
    }

    /**
     * Muestra el formulario para crear un nuevo dispositivo.
     */
    private mostrarFormularioNuevoDispositivo(): void {
        let form = this.recuperarElemento<HTMLElement>("formNuevoDispositivo");
        form.style.display = 'block';
    }

    /**
     * Muestra una confirmación antes de guardar un nuevo dispositivo.
     */
    private confirmarGuardarNuevoDispositivo(): void {
        let nombre = this.recuperarElemento<HTMLInputElement>("nombreDispositivo").value;
        let descripcion = this.recuperarElemento<HTMLInputElement>("descripcionDispositivo").value;

        if (!nombre || !descripcion) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        if (confirm("¿Estás seguro de que deseas guardar el nuevo dispositivo?")) {
            this.guardarNuevoDispositivo();
        }
    }

    /**
     * Guarda un nuevo dispositivo.
     */
    private guardarNuevoDispositivo(): void {
        let nombre = this.recuperarElemento<HTMLInputElement>("nombreDispositivo").value;
        let descripcion = this.recuperarElemento<HTMLInputElement>("descripcionDispositivo").value;

        let nuevoDispositivo = { name: nombre, description: descripcion, type: 2, state: 0 };
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open("POST", "http://localhost:8000/devices", true);
        xmlHttp.setRequestHeader("Content-Type", "application/json");
        xmlHttp.send(JSON.stringify(nuevoDispositivo));

        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 201) {
                this.ocultarFormularioNuevoDispositivo();
                this.buscarDevices();
            } else if (xmlHttp.readyState == 4) {
                console.error("Error al guardar el dispositivo:", xmlHttp.status, xmlHttp.statusText);
            }
        };
    }

    /**
     * Muestra el formulario para editar un dispositivo existente.
     */
    private mostrarFormularioEditarDispositivo(): void {
        let dispositivosSeleccionados = document.querySelectorAll('.checkbox-card:checked');
        if (dispositivosSeleccionados.length !== 1) {
            alert("Por favor, selecciona un único dispositivo para editar.");
            return;
        }

        let dispositivoId = (dispositivosSeleccionados[0] as HTMLInputElement).getAttribute('idBd');
        let nombreDispositivo = this.recuperarElemento<HTMLInputElement>(`nombre_${dispositivoId}`).textContent || '';
        let descripcionDispositivo = this.recuperarElemento<HTMLInputElement>(`descripcion_${dispositivoId}`).textContent || '';

        let formEditar = this.recuperarElemento<HTMLElement>("formEditarDispositivo");
        (this.recuperarElemento<HTMLInputElement>("editNombreDispositivo")).value = nombreDispositivo;
        (this.recuperarElemento<HTMLInputElement>("editDescripcionDispositivo")).value = descripcionDispositivo;
        formEditar.style.display = 'block';
    }

    /**
     * Guarda los cambios de un dispositivo después de la edición.
     */
    private guardarEdicionDispositivo(): void {
        let dispositivosSeleccionados = document.querySelectorAll('.checkbox-card:checked');
        if (dispositivosSeleccionados.length !== 1) {
            alert("Por favor, selecciona un único dispositivo para guardar cambios.");
            return;
        }

        let dispositivoId = (dispositivosSeleccionados[0] as HTMLInputElement).getAttribute('idBd');
        let nombreDispositivo = this.recuperarElemento<HTMLInputElement>("editNombreDispositivo").value;
        let descripcionDispositivo = this.recuperarElemento<HTMLInputElement>("editDescripcionDispositivo").value;

        if (!nombreDispositivo || !descripcionDispositivo) {
            alert("Todos los campos son requeridos.");
            return;
        }

        if (confirm("¿Estás seguro de que deseas guardar los cambios en el dispositivo?")) {
            let updateData = { name: nombreDispositivo, description: descripcionDispositivo };

            let xmlHttp = new XMLHttpRequest();
            xmlHttp.open("PUT", `http://localhost:8000/devices/${dispositivoId}`, true);
            xmlHttp.setRequestHeader("Content-Type", "application/json");
            xmlHttp.send(JSON.stringify(updateData));

            xmlHttp.onreadystatechange = () => {
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    this.buscarDevices();
                    this.ocultarFormularioEditarDispositivo();
                } else if (xmlHttp.readyState == 4) {
                    console.error("Error al actualizar el dispositivo:", xmlHttp.status, xmlHttp.statusText);
                }
            };
        }
    }

    /**
     * Oculta el formulario de edición de dispositivo.
     */
    private ocultarFormularioEditarDispositivo(): void {
        let formEditar = this.recuperarElemento<HTMLElement>("formEditarDispositivo");
        formEditar.style.display = 'none';
    }

    /**
     * Oculta el formulario de creación de nuevo dispositivo.
     */
    private ocultarFormularioNuevoDispositivo(): void {
        let form = this.recuperarElemento<HTMLElement>("formNuevoDispositivo");
        form.style.display = 'none';
    }

    /**
     * Obtiene la imagen correspondiente según el tipo de dispositivo.
     */
    private obtenerImagenPorTipo(type: number): string {
        switch (type) {
            case 0:
                return 'window.png';
            case 1:
                return 'lightbulb.png';
            case 2:
                return 'default.jpg';
            case 3:
                return 'ventilador.png';
            default:
                return 'default.jpg';
        }
    }

    /**
     * Elimina los dispositivos seleccionados.
     */
    private eliminarDispositivosSeleccionados(): void {
        let dispositivosSeleccionados = document.querySelectorAll('.checkbox-card:checked');
        if (dispositivosSeleccionados.length === 0) {
            alert("Selecciona al menos un dispositivo para eliminar.");
            return;
        }

        if (confirm("¿Estás seguro de que deseas eliminar los dispositivos seleccionados?")) {
            dispositivosSeleccionados.forEach((checkbox) => {
                let deviceId = (checkbox as HTMLInputElement).getAttribute('idBd');

                let xmlHttp = new XMLHttpRequest();
                xmlHttp.open("DELETE", `http://localhost:8000/devices/${deviceId}`, true);
                xmlHttp.send();

                xmlHttp.onreadystatechange = () => {
                    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                        this.buscarDevices();
                    } else if (xmlHttp.readyState == 4) {
                        console.error("Error al eliminar el dispositivo:", xmlHttp.status, xmlHttp.statusText);
                    }
                };
            });
        }
    }

    /**
     * Recupera un elemento del DOM según su ID.
     */
    private recuperarElemento<T extends HTMLElement>(id: string): T {
        return document.getElementById(id) as T;
    }
}

// Iniciar el controlador principal al cargar la ventana
window.addEventListener('load', () => {
    new Main();
});