//=======[ Settings, Imports & Data ]==========================================

const express = require('express');
const mysql = require('mysql');
const app = express();

// Puerto del servidor
const PORT = 3000;

// Configuración para analizar JSON en las solicitudes
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'static'
app.use(express.static('/home/node/app/static'));

//=======[ MySQL Connection with Auto-Reconnect ]===============================

// Configuración de la base de datos
const db_config = {
    host: 'mysql-server',
    user: 'root',
    password: 'userpass',
    database: 'smart_home'
};

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(db_config);

    connection.connect(function (err) {
        if (err) {
            console.log('Error al conectar a la base de datos:', err);
            setTimeout(handleDisconnect, 2000); // Espera y vuelve a intentar conectarse
        } else {
            console.log('Conectado a la base de datos MySQL');
        }
    });

    connection.on('error', function (err) {
        console.log('Error en la base de datos:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); // Reconectar en caso de que la conexión se pierda
        } else {
            throw err; // Otros errores deben ser manejados externamente
        }
    });
}

// Inicia la conexión con la lógica de reconexión automática
handleDisconnect();

//=======[ Endpoints CRUD ]====================================================

// POST /devices - Agregar un nuevo dispositivo
app.post('/devices', (req, res) => {
    const { name, description, type, state } = req.body;

    if (!name || !description || !type || state === undefined) {
        return res.status(400).send('Datos incompletos o incorrectos');
    }

    const query = 'INSERT INTO Devices (name, description, type, state) VALUES (?, ?, ?, ?)';
    connection.query(query, [name, description, type, state], (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.status(201).send('Dispositivo agregado exitosamente');
    });
});

// GET /devices/:id - Obtener un dispositivo por ID
app.get('/devices/:id', (req, res) => {
    const { id } = req.params;

    const query = 'SELECT * FROM Devices WHERE id = ?';
    connection.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (result.length === 0) {
            return res.status(404).send('Dispositivo no encontrado');
        }
        res.status(200).json(result[0]);
    });
});

// GET /devices - Obtener todos los dispositivos
app.get('/devices', (req, res) => {
    const query = 'SELECT * FROM Devices';
    connection.query(query, (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.status(200).json(result);
    });
});

// PUT /devices/:id - Actualizar un dispositivo (sin obligar a enviar el estado)
app.put('/devices/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, state } = req.body;

    if (!name || !description) {
        return res.status(400).send('Datos incompletos o incorrectos');
    }

    const query = state === undefined 
        ? 'UPDATE Devices SET name = ?, description = ? WHERE id = ?' 
        : 'UPDATE Devices SET name = ?, description = ?, state = ? WHERE id = ?';
    
    const queryParams = state === undefined
        ? [name, description, id]
        : [name, description, state, id];
    
    connection.query(query, queryParams, (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Dispositivo no encontrado');
        }
        res.status(200).send('Dispositivo actualizado exitosamente');
    });
});

// PUT /devices/:id/state - Actualizar solo el estado de un dispositivo
app.put('/devices/:id/state', (req, res) => {
    const { id } = req.params;
    const { state } = req.body;

    // Validar que se haya proporcionado el estado
    if (state === undefined) {
        return res.status(400).send('Estado (state) no proporcionado');
    }

    // Solo actualizar el campo "state"
    const query = 'UPDATE Devices SET state = ? WHERE id = ?';
    connection.query(query, [state, id], (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Dispositivo no encontrado');
        }
        res.status(200).send('Estado del dispositivo actualizado exitosamente');
    });
});

// DELETE /devices/:id - Eliminar un dispositivo
app.delete('/devices/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Devices WHERE id = ?';
    connection.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Dispositivo no encontrado');
        }
        res.status(200).send('Dispositivo eliminado correctamente');
    });
});

//=======[ Main module code ]==================================================

// Endpoint de prueba para obtener lista de usuarios
app.get('/usuario', function (req, res) {
    res.send("[{id:1,name:'mramos'},{id:2,name:'fperez'}]");
});

// Obtener lista de dispositivos de ejemplo (hardcoded)
app.get('/devices/hardcoded', function (req, res, next) {
    const devices = [
        { id: 1, name: 'Lampara 1', description: 'Luz living', state: 0, type: 1 },
        { id: 2, name: 'Ventilador 1', description: 'Ventilador Habitacion', state: 1, type: 2 },
        { id: 3, name: 'Luz Cocina 1', description: 'Cocina', state: 1, type: 2 }
    ];
    res.send(JSON.stringify(devices)).status(200);
});

//=======[ Start the Server ]===================================================

// Iniciar el servidor en el puerto especificado
app.listen(PORT, function () {
    console.log("Servidor Node.js corriendo en el puerto " + PORT);
});

//=======[ End of file ]========================================================