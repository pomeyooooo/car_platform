// 引入必要的模組
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fileUpload = require('express-fileupload');
const cors = require('cors');

// 初始化 Express 應用
const app = express();

// 健康檢查路由
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: '智慧車輛管理平台 API 正在運行',
    timestamp: new Date().toISOString()
  });
});

// 設定中間件
app.use(cors({
  origin: function (origin, callback) {
    // 允許沒有 origin 的請求（如手機應用程式、Postman）
    if (!origin) return callback(null, true);
    
    // 允許的來源列表
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      /https:\/\/.*\.netlify\.app$/,     // 所有 Netlify 網址
      /https:\/\/.*\.onrender\.com$/     // 所有 Render 網址
    ];
    
    // 檢查來源是否被允許
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else {
        return allowedOrigin.test(origin);
      }
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // 某些舊版瀏覽器（IE11、各種 SmartTV）對 204 有問題
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', true);
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 設定視圖引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 創建上傳目錄
const uploadDir = path.join(__dirname, 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 引入路由文件
const userRoutes = require('./routes/user');
const vehicleRoutes = require('./routes/vehicle');
const rentalRoutes = require('./routes/rental');
const maintenanceRoutes = require('./routes/maintenance');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');

// 使用路由
app.use('/user', userRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/rentals', rentalRoutes);
app.use('/maintenance', maintenanceRoutes);
app.use('/users', usersRoutes);
app.use('/reports', reportsRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 基本路由
app.get('/', (req, res) => {
  res.render('index', { title: '智慧車輛管理平台' });
});

// 配置文件上傳
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
}));

// 儀表板路由
app.get('/dashboard', async (req, res) => {
  try {
    const db = require('./config/jsonDB');
    const vehicles = await db.getAllVehicles();
    const rentalLogs = await db.getAllRentalLogs();
    
    // 計算統計數據
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
    const brokenVehicles = vehicles.filter(v => v.status === 'broken').length;
    
    res.render('dashboard/index', {
      vehicleCount: vehicles.length,
      availableVehicles,
      rentedVehicles,
      brokenVehicles,
      recentLogs: rentalLogs.slice(-5)
    });
  } catch (err) {
    console.error('載入儀表板錯誤:', err);
    res.status(500).send('載入儀表板時發生錯誤');
  }
});

// 設定伺服器端口
const PORT = process.env.PORT || 10000;

// app.listen(PORT, () => {
//   console.log(`伺服器運行於 http://localhost:${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`伺服器運行於 http://0.0.0.0:${PORT}`);
});