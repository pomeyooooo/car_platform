const express = require('express');
const router = express.Router();
const db = require('../config/jsonDB');

// 獲取所有車輛
router.get('/', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    res.render('dashboard/vehicles', { vehicles });
  } catch (err) {
    console.error('獲取車輛列表錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 處理新增車輛請求
router.post('/add', async (req, res) => {
  try {
    const { license_plate, mileage, last_maintenance_date, status } = req.body;
    
    const newVehicle = {
      license_plate,
      mileage: parseInt(mileage),
      low_oil_volume: false,
      warning_light: false,
      status: status || 'available',
      last_maintenance_date,
      last_maintainance_mileage: parseInt(mileage)
    };
    
    await db.addVehicle(newVehicle);
    res.redirect('/vehicles');
  } catch (err) {
    console.error('新增車輛錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 獲取車輛詳情
router.get('/details/:id', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const vehicle = vehicles.find(v => v.id === parseInt(req.params.id));
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: '車輛不存在' });
    }
    
    res.json({ success: true, vehicle });
  } catch (err) {
    console.error('獲取車輛詳情錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 更新車輛信息
router.post('/update/:id', async (req, res) => {
  try {
    const { license_plate, mileage, last_maintenance_date, status, low_oil_volume, warning_light } = req.body;
    
    const updatedVehicle = {
      id: parseInt(req.params.id),
      license_plate,
      mileage: parseInt(mileage),
      low_oil_volume: low_oil_volume === 'true',
      warning_light: warning_light === 'true',
      status,
      last_maintenance_date,
      last_maintainance_mileage: parseInt(mileage)
    };
    
    await db.updateVehicle(parseInt(req.params.id), updatedVehicle);
    res.redirect('/vehicles');
  } catch (err) {
    console.error('更新車輛錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 刪除車輛
router.post('/delete/:id', async (req, res) => {
  try {
    await db.deleteVehicle(parseInt(req.params.id));
    res.redirect('/vehicles');
  } catch (err) {
    console.error('刪除車輛錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// API 獲取所有車輛 (JSON格式)
router.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    res.json({ success: true, vehicles });
  } catch (err) {
    console.error('API 獲取車輛列表錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;