const express = require('express');
const router = express.Router();
const db = require('../config/jsonDB');

// 設定預設維護設定
const DEFAULT_MAINTENANCE_SETTINGS = {
  maintenance_interval_km: 5000, // 每5000公里保養一次
  oil_change_interval_km: 3000,  // 每3000公里換機油
  warning_threshold_km: 500,     // 距離保養500公里時提醒
  fuel_warning_threshold: 0.2    // 油量低於20%時警告
};

// 獲取所有維護記錄
router.get('/', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const maintenanceRecords = [];
    
    // 為每個車輛計算維護狀態
    vehicles.forEach(vehicle => {
      const mileageSinceLastMaintenance = vehicle.mileage - vehicle.last_maintainance_mileage;
      const nextMaintenanceKm = vehicle.last_maintainance_mileage + DEFAULT_MAINTENANCE_SETTINGS.maintenance_interval_km;
      const kmUntilMaintenance = nextMaintenanceKm - vehicle.mileage;
      
      // 判斷維護狀態
      let maintenanceStatus = 'good';
      if (kmUntilMaintenance <= 0) {
        maintenanceStatus = 'overdue';
      } else if (kmUntilMaintenance <= DEFAULT_MAINTENANCE_SETTINGS.warning_threshold_km) {
        maintenanceStatus = 'warning';
      }
      
      // 判斷機油狀態
      let oilStatus = 'good';
      if (vehicle.low_oil_volume) {
        oilStatus = 'low';
      }
      
      maintenanceRecords.push({
        license_plate: vehicle.license_plate,
        current_mileage: vehicle.mileage,
        last_maintenance_date: vehicle.last_maintenance_date,
        last_maintenance_mileage: vehicle.last_maintainance_mileage,
        mileage_since_last_maintenance: mileageSinceLastMaintenance,
        next_maintenance_km: nextMaintenanceKm,
        km_until_maintenance: kmUntilMaintenance,
        maintenance_status: maintenanceStatus,
        oil_status: oilStatus,
        warning_light: vehicle.warning_light,
        status: vehicle.status
      });
    });
    
    res.render('dashboard/maintenance', { 
      maintenanceRecords: maintenanceRecords,
      settings: DEFAULT_MAINTENANCE_SETTINGS
    });
  } catch (err) {
    console.error('獲取維護記錄錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// API: 獲取維護記錄
router.get('/api/records', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const maintenanceRecords = [];
    
    vehicles.forEach(vehicle => {
      const mileageSinceLastMaintenance = vehicle.mileage - vehicle.last_maintainance_mileage;
      const nextMaintenanceKm = vehicle.last_maintainance_mileage + DEFAULT_MAINTENANCE_SETTINGS.maintenance_interval_km;
      const kmUntilMaintenance = nextMaintenanceKm - vehicle.mileage;
      
      let maintenanceStatus = 'good';
      if (kmUntilMaintenance <= 0) {
        maintenanceStatus = 'overdue';
      } else if (kmUntilMaintenance <= DEFAULT_MAINTENANCE_SETTINGS.warning_threshold_km) {
        maintenanceStatus = 'warning';
      }
      
      let oilStatus = 'good';
      if (vehicle.low_oil_volume) {
        oilStatus = 'low';
      }
      
      maintenanceRecords.push({
        license_plate: vehicle.license_plate,
        current_mileage: vehicle.mileage,
        last_maintenance_date: vehicle.last_maintenance_date,
        last_maintenance_mileage: vehicle.last_maintainance_mileage,
        mileage_since_last_maintenance: mileageSinceLastMaintenance,
        next_maintenance_km: nextMaintenanceKm,
        km_until_maintenance: kmUntilMaintenance,
        maintenance_status: maintenanceStatus,
        oil_status: oilStatus,
        warning_light: vehicle.warning_light,
        status: vehicle.status,
        priority: maintenanceStatus === 'overdue' ? 'high' : 
                 maintenanceStatus === 'warning' ? 'medium' : 'low'
      });
    });
    
    // 按優先級排序
    maintenanceRecords.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    res.json({ success: true, records: maintenanceRecords });
  } catch (err) {
    console.error('API 獲取維護記錄錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取需要維護的車輛警告
router.get('/api/alerts', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const alerts = [];
    
    vehicles.forEach(vehicle => {
      const nextMaintenanceKm = vehicle.last_maintainance_mileage + DEFAULT_MAINTENANCE_SETTINGS.maintenance_interval_km;
      const kmUntilMaintenance = nextMaintenanceKm - vehicle.mileage;
      
      // 逾期維護警告
      if (kmUntilMaintenance <= 0) {
        alerts.push({
          type: 'maintenance_overdue',
          severity: 'high',
          license_plate: vehicle.license_plate,
          message: `車輛 ${vehicle.license_plate} 已逾期保養 ${Math.abs(kmUntilMaintenance)} 公里`,
          action_required: '立即安排保養'
        });
      }
      // 即將維護警告
      else if (kmUntilMaintenance <= DEFAULT_MAINTENANCE_SETTINGS.warning_threshold_km) {
        alerts.push({
          type: 'maintenance_warning',
          severity: 'medium',
          license_plate: vehicle.license_plate,
          message: `車輛 ${vehicle.license_plate} 還有 ${kmUntilMaintenance} 公里需要保養`,
          action_required: '計劃保養時間'
        });
      }
      
      // 機油警告
      if (vehicle.low_oil_volume) {
        alerts.push({
          type: 'oil_low',
          severity: 'high',
          license_plate: vehicle.license_plate,
          message: `車輛 ${vehicle.license_plate} 機油量過低`,
          action_required: '立即加油或檢查'
        });
      }
      
      // 警示燈警告
      if (vehicle.warning_light) {
        alerts.push({
          type: 'warning_light',
          severity: 'high',
          license_plate: vehicle.license_plate,
          message: `車輛 ${vehicle.license_plate} 警示燈亮起`,
          action_required: '立即檢查車輛狀況'
        });
      }
    });
    
    res.json({ success: true, alerts });
  } catch (err) {
    console.error('API 獲取維護警告錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 記錄維護完成
router.post('/api/complete', async (req, res) => {
  try {
    const { license_plate, maintenance_type, notes, cost } = req.body;
    
    if (!license_plate || !maintenance_type) {
      return res.status(400).json({ success: false, message: '缺少必要參數' });
    }
    
    const vehicles = await db.getAllVehicles();
    const vehicleIndex = vehicles.findIndex(v => v.license_plate === license_plate);
    
    if (vehicleIndex === -1) {
      return res.status(404).json({ success: false, message: '找不到車輛' });
    }
    
    // 更新車輛維護記錄
    const currentDate = new Date().toISOString().split('T')[0];
    vehicles[vehicleIndex].last_maintenance_date = currentDate;
    vehicles[vehicleIndex].last_maintainance_mileage = vehicles[vehicleIndex].mileage;
    vehicles[vehicleIndex].low_oil_volume = false; // 保養後重設機油狀態
    vehicles[vehicleIndex].warning_light = false; // 保養後重設警示燈
    
    // 保存更新
    const dbData = await db.readDb();
    dbData.vehicles = vehicles;
    
    // 添加維護日誌
    if (!dbData.maintenance_logs) {
      dbData.maintenance_logs = [];
    }
    
    const maintenanceLog = {
      log_id: (dbData.maintenance_logs.length + 1),
      license_plate,
      maintenance_type,
      maintenance_date: currentDate,
      mileage_at_maintenance: vehicles[vehicleIndex].mileage,
      notes: notes || '',
      cost: cost || 0,
      performed_by: 'admin' // 可以根據登入用戶修改
    };
    
    dbData.maintenance_logs.push(maintenanceLog);
    await db.writeDb(dbData);
    
    res.json({ 
      success: true, 
      message: '維護記錄已完成',
      maintenance_log: maintenanceLog
    });
  } catch (err) {
    console.error('API 完成維護錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取維護設定
router.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: DEFAULT_MAINTENANCE_SETTINGS });
});

// API: 更新維護設定
router.post('/api/settings', (req, res) => {
  try {
    const { maintenance_interval_km, oil_change_interval_km, warning_threshold_km, fuel_warning_threshold } = req.body;
    
    // 這裡可以將設定保存到配置文件或資料庫
    // 目前使用記憶體存儲（重啟後會重設）
    if (maintenance_interval_km) DEFAULT_MAINTENANCE_SETTINGS.maintenance_interval_km = parseInt(maintenance_interval_km);
    if (oil_change_interval_km) DEFAULT_MAINTENANCE_SETTINGS.oil_change_interval_km = parseInt(oil_change_interval_km);
    if (warning_threshold_km) DEFAULT_MAINTENANCE_SETTINGS.warning_threshold_km = parseInt(warning_threshold_km);
    if (fuel_warning_threshold) DEFAULT_MAINTENANCE_SETTINGS.fuel_warning_threshold = parseFloat(fuel_warning_threshold);
    
    res.json({ 
      success: true, 
      message: '設定已更新',
      settings: DEFAULT_MAINTENANCE_SETTINGS
    });
  } catch (err) {
    console.error('API 更新維護設定錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取所有維護歷史記錄
router.get('/api/history', async (req, res) => {
  try {
    const dbData = await db.readDb();
    const maintenanceLogs = dbData.maintenance_logs || [];
    
    res.json({ success: true, history: maintenanceLogs });
  } catch (err) {
    console.error('API 獲取維護歷史錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取特定車輛維護歷史記錄
router.get('/api/history/:license_plate', async (req, res) => {
  try {
    const { license_plate } = req.params;
    const dbData = await db.readDb();
    
    let maintenanceLogs = dbData.maintenance_logs || [];
    maintenanceLogs = maintenanceLogs.filter(log => log.license_plate === license_plate);
    
    res.json({ success: true, history: maintenanceLogs });
  } catch (err) {
    console.error('API 獲取維護歷史錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;