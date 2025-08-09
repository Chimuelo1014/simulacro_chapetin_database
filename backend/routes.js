// backend/routes.js
import { Router } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { authMiddleware } from './middleware_auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const upload = multer({ dest: 'backend/uploads/' });

// ---------- AUTH ----------
router.post('/auth/register', async (req, res) => {
  // Usar sólo para crear administradores o cuentas iniciales.
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Faltan datos' });

    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) return res.status(400).json({ message: 'Usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ message: 'Usuario creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.status(400).json({ message: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
});

// ---------- PACIENTES (CRUD) ----------
router.get('/pacientes', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pacientes ORDER BY id_paciente DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.get('/pacientes/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pacientes WHERE id_paciente = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.post('/pacientes', authMiddleware, async (req, res) => {
  try {
    const { nombre_paciente, correo_paciente } = req.body;
    const [result] = await pool.query('INSERT INTO pacientes (nombre_paciente, correo_paciente) VALUES (?, ?)', [nombre_paciente, correo_paciente]);
    res.json({ id: result.insertId, message: 'Paciente creado' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error' }); }
});

router.put('/pacientes/:id', authMiddleware, async (req, res) => {
  try {
    const { nombre_paciente, correo_paciente } = req.body;
    await pool.query('UPDATE pacientes SET nombre_paciente = ?, correo_paciente = ? WHERE id_paciente = ?', [nombre_paciente, correo_paciente, req.params.id]);
    res.json({ message: 'Paciente actualizado' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.delete('/pacientes/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM pacientes WHERE id_paciente = ?', [req.params.id]);
    res.json({ message: 'Paciente eliminado' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ---------- MEDICOS (CRUD) ----------
router.get('/medicos', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM medicos ORDER BY id_medico DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.post('/medicos', authMiddleware, async (req, res) => {
  try {
    const { nombre_medico } = req.body;
    const [result] = await pool.query('INSERT INTO medicos (nombre_medico) VALUES (?)', [nombre_medico]);
    res.json({ id: result.insertId, message: 'Médico creado' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.put('/medicos/:id', authMiddleware, async (req, res) => {
  try {
    const { nombre_medico } = req.body;
    await pool.query('UPDATE medicos SET nombre_medico = ? WHERE id_medico = ?', [nombre_medico, req.params.id]);
    res.json({ message: 'Médico actualizado' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.delete('/medicos/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM medicos WHERE id_medico = ?', [req.params.id]);
    res.json({ message: 'Médico eliminado' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ---------- CITAS (CRUD) ----------
router.get('/citas', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.motivo, c.descripcion, c.ubicacion, c.metodo_pago, c.estatus_cita,
             c.id_medico, c.id_paciente,
             p.nombre_paciente, m.nombre_medico
      FROM cita c
      JOIN pacientes p ON c.id_paciente = p.id_paciente
      JOIN medicos m ON c.id_medico = m.id_medico
      ORDER BY c.fecha_cita DESC, c.hora_cita DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error' }); }
});

router.post('/citas', authMiddleware, async (req, res) => {
  try {
    const { fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente } = req.body;
    const [result] = await pool.query(
      `INSERT INTO cita (fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente]
    );
    res.json({ id: result.insertId, message: 'Cita creada' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error' }); }
});

router.put('/citas/:id', authMiddleware, async (req, res) => {
  try {
    const { fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente } = req.body;
    await pool.query(
      `UPDATE cita SET fecha_cita=?, hora_cita=?, motivo=?, descripcion=?, ubicacion=?, metodo_pago=?, estatus_cita=?, id_medico=?, id_paciente=? WHERE id_cita=?`,
      [fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente, req.params.id]
    );
    res.json({ message: 'Cita actualizada' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Error' }); }
});

router.delete('/citas/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM cita WHERE id_cita = ?', [req.params.id]);
    res.json({ message: 'Cita eliminada' });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ---------- CARGA CSV (pacientes y medicos) ----------
router.post('/upload/pacientes', authMiddleware, upload.single('file'), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      // esperar columnas: nombre_paciente, correo_paciente
      results.push(data);
    })
    .on('end', async () => {
      try {
        for (const row of results) {
          if (!row.nombre_paciente || !row.correo_paciente) continue;
          await pool.query('INSERT INTO pacientes (nombre_paciente, correo_paciente) VALUES (?, ?)', [row.nombre_paciente, row.correo_paciente]);
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Pacientes cargados' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al insertar' });
      }
    });
});

router.post('/upload/medicos', authMiddleware, upload.single('file'), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (const row of results) {
          if (!row.nombre_medico) continue;
          await pool.query('INSERT INTO medicos (nombre_medico) VALUES (?)', [row.nombre_medico]);
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Médicos cargados' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al insertar' });
      }
    });
});

router.post('/upload/citas', authMiddleware, upload.single('file'), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let insertadas = 0;
      let saltadas = 0;

      try {
        for (const row of results) {
          if (!row.fecha_cita || !row.hora_cita || !row.id_medico || !row.id_paciente) {
            saltadas++;
            continue;
          }

          // Verificar médico
          const [medico] = await pool.query('SELECT id_medico FROM medicos WHERE id_medico = ?', [row.id_medico]);
          if (!medico.length) {
            await pool.query(
              'INSERT INTO medicos (id_medico, nombre_medico) VALUES (?, ?)',
              [row.id_medico, `Medico${row.id_medico}`]
            );
          }

          // Verificar paciente
          const [paciente] = await pool.query('SELECT id_paciente FROM pacientes WHERE id_paciente = ?', [row.id_paciente]);
          if (!paciente.length) {
            await pool.query(
              'INSERT INTO pacientes (id_paciente, nombre_paciente, correo_paciente) VALUES (?, ?, ?)',
              [row.id_paciente, `Paciente${row.id_paciente}`, `paciente${row.id_paciente}@correo.com`]
            );
          }

          // Insertar cita sin id_cita (MySQL lo genera solo)
          await pool.query(
            `INSERT INTO cita (fecha_cita, hora_cita, motivo, descripcion, ubicacion, metodo_pago, estatus_cita, id_medico, id_paciente)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.fecha_cita,
              row.hora_cita,
              row.motivo || null,
              row.descripcion || null,
              row.ubicacion || null,
              row.metodo_pago || null,
              row.estatus_cita || null,
              row.id_medico,
              row.id_paciente
            ]
          );

          insertadas++;
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: `Citas cargadas: ${insertadas}, filas saltadas: ${saltadas}` });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al insertar citas', error: err.message });
      }
    });
});



router.delete('/reset/:tabla', authMiddleware, async (req, res) => {
  try {
    const tablasPermitidas = ['pacientes', 'medicos', 'cita'];
    const { tabla } = req.params;

    if (!tablasPermitidas.includes(tabla)) {
      return res.status(400).json({ message: 'Tabla no permitida' });
    }

    // 🔹 Desactivar claves foráneas
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    if (tabla === 'pacientes') {
      await pool.query('TRUNCATE TABLE cita');
      await pool.query('TRUNCATE TABLE pacientes');
    } else if (tabla === 'medicos') {
      await pool.query('TRUNCATE TABLE cita');
      await pool.query('TRUNCATE TABLE medico_especialidad');
      await pool.query('TRUNCATE TABLE medicos');
    } else if (tabla === 'cita') {
      await pool.query('TRUNCATE TABLE cita');
    }

    // 🔹 Volver a activar claves foráneas
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    res.json({ message: `Tabla ${tabla} reiniciada correctamente` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al reiniciar tabla', error: err.message });
  }
});




export default router;
