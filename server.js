const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'مفتاحك_السري_هنا';
const saltRounds = 10;

// إعدادات الميدل وير
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// إتصال قاعدة البيانات
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'clinic',
});

// الاتصال بقاعدة البيانات
db.connect((err) => {
  if (err) {
    console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    return;
  }
  console.log('تم الاتصال بنجاح بقاعدة البيانات MySQL');
});

// إعدادات رفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ميدل وير للتحقق من التوكن
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'مطلوب مصادقة للوصول' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'توكن غير صالح أو منتهي الصلاحية' });
    }
    req.user = user;
    next();
  });
}

// 1. تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  const { username, password, email, role = 'user' } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query = 'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)';
    
    db.query(query, [username, hashedPassword, email, role], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقاً' });
        }
        console.error(err);
        return res.status(500).json({ error: 'فشل في تسجيل المستخدم' });
      }
      res.status(201).json({ message: 'تم تسجيل المستخدم بنجاح!' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم أثناء التسجيل' });
  }
});

// 2. تسجيل الدخول
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'فشل في تسجيل الدخول' });
    }

    if (results.length > 0) {
      const user = results[0];
      try {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
          );
          res.status(200).json({
            message: 'تم تسجيل الدخول بنجاح!',
            token,
            user: { id: user.id, username: user.username, role: user.role, email: user.email }
          });
        } else {
          res.status(401).json({ error: 'بيانات الاعتماد غير صحيحة' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم أثناء تسجيل الدخول' });
      }
    } else {
      res.status(401).json({ error: 'بيانات الاعتماد غير صحيحة' });
    }
  });
});

// 3. الحصول على ملف المستخدم (محمي)
app.get('/api/users/me', authenticateToken, (req, res) => {
  const query = 'SELECT id, username, email, role, created_at FROM users WHERE username = ?';
  db.query(query, [req.user.username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'فشل في جلب ملف المستخدم' });
    }
    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).json({ error: 'المستخدم غير موجود' });
    }
  });
});

// 4. إنشاء موعد (محمي)
app.post('/api/appointments', authenticateToken, (req, res) => {
  const { patientName, phone, appointmentDate, doctorId, notes } = req.body;

  if (!patientName || !phone || !appointmentDate || !doctorId) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });
  }

  const query = 'INSERT INTO appointments (patientName, phone, appointmentDate, doctorId, notes, userId) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [patientName, phone, appointmentDate, doctorId, notes || null, req.user.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'فشل في إنشاء الموعد' });
    }
    res.status(201).json({ 
      message: 'تم إنشاء الموعد بنجاح!',
      appointmentId: result.insertId
    });
  });
});

// 5. الحصول على جميع المواعيد (محمي، للمشرف فقط)
app.get('/api/appointments', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'وصول غير مصرح به' });
  }

  const query = 'SELECT a.*, u.username as doctorName FROM appointments a LEFT JOIN users u ON a.doctorId = u.id';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'فشل في جلب المواعيد' });
    }
    res.status(200).json(results);
  });
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على http://localhost:${PORT}`);
});