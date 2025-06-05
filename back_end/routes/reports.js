const express = require('express');
const router = express.Router();
const db = require('../config/jsonDB');

// 獲取報表頁面
router.get('/', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const rentalLogs = await db.getAllRentalLogs();
    const users = await db.getAllUsers();
    
    res.render('dashboard/reports', { 
      vehicles,
      rentalLogs,
      users
    });
  } catch (err) {
    console.error('獲取報表數據錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// API: 系統總覽
router.get('/api/system-overview', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const rentalLogs = await db.getAllRentalLogs();
    const users = await db.getAllUsers();
    
    // 車輛摘要
    const vehicleSummary = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      rented: vehicles.filter(v => v.status === 'rented').length,
      broken: vehicles.filter(v => v.status === 'broken').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length
    };
    
    // 活動摘要
    const activitySummary = {
      total_rentals: rentalLogs.length,
      active_rentals: rentalLogs.filter(log => !log.return_time).length,
      completed_rentals: rentalLogs.filter(log => log.return_time).length,
      total_users: users.length
    };
    
    // 警告和提醒
    const alerts = [];
    
    // 檢查需要維護的車輛
    vehicles.forEach(vehicle => {
      if (vehicle.status === 'broken') {
        alerts.push({
          type: 'vehicle_broken',
          severity: 'high',
          message: `車輛 ${vehicle.license_plate} 需要維修`,
          vehicle_id: vehicle.license_plate
        });
      }
      
      if (vehicle.low_oil_volume) {
        alerts.push({
          type: 'low_oil',
          severity: 'medium',
          message: `車輛 ${vehicle.license_plate} 油量不足`,
          vehicle_id: vehicle.license_plate
        });
      }
      
      if (vehicle.warning_light) {
        alerts.push({
          type: 'warning_light',
          severity: 'high',
          message: `車輛 ${vehicle.license_plate} 警示燈亮起`,
          vehicle_id: vehicle.license_plate
        });
      }
    });
    
    // 檢查逾期未還的租借
    const now = new Date();
    rentalLogs.forEach(log => {
      if (!log.return_time) {
        const rentDate = new Date(log.rent_time);
        const daysDiff = Math.floor((now - rentDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 7) { // 超過7天未還
          alerts.push({
            type: 'overdue_rental',
            severity: 'high',
            message: `租借記錄 ${log.log_ID} 已逾期 ${daysDiff} 天`,
            rental_id: log.log_ID
          });
        }
      }
    });
    
    res.json({
      success: true,
      system_overview: {
        vehicle_summary: vehicleSummary,
        activity_summary: activitySummary,
        alerts: alerts,
        last_updated: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('API 系統總覽錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 車輛使用情況
router.get('/api/vehicle-usage', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const rentalLogs = await db.getAllRentalLogs();
    
    const vehicleUsage = vehicles.map(vehicle => {
      // 計算該車輛的租借次數
      const vehicleRentals = rentalLogs.filter(log => log.vehicle_id === vehicle.license_plate);
      
      // 計算總里程
      let totalMileage = 0;
      vehicleRentals.forEach(rental => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          totalMileage += (rental.mileage_after_driving - rental.mileage_before_driving);
        }
      });
      
      // 計算平均使用率
      const daysActive = vehicleRentals.length > 0 ? 
        Math.max(1, Math.floor((new Date() - new Date(vehicleRentals[0].rent_time)) / (1000 * 60 * 60 * 24))) : 1;
      
      return {
        license_plate: vehicle.license_plate,
        current_mileage: vehicle.mileage,
        total_rental_mileage: totalMileage,
        rental_count: vehicleRentals.length,
        utilization_rate: (vehicleRentals.length / daysActive * 100).toFixed(2),
        last_rental_date: vehicleRentals.length > 0 ? 
          vehicleRentals[vehicleRentals.length - 1].rent_time : null,
        status: vehicle.status,
        issues: {
          low_oil: vehicle.low_oil_volume,
          warning_light: vehicle.warning_light
        }
      };
    });
    
    res.json({
      success: true,
      vehicle_usage: vehicleUsage
    });
  } catch (err) {
    console.error('API 車輛使用情況錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 租借趨勢分析
router.get('/api/rental-trends', async (req, res) => {
  try {
    const rentalLogs = await db.getAllRentalLogs();
    const { period = 'week', start_date, end_date } = req.query;
    
    let filteredLogs = rentalLogs;
    
    // 日期篩選
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      filteredLogs = rentalLogs.filter(log => {
        const rentDate = new Date(log.rent_time);
        return rentDate >= startDate && rentDate <= endDate;
      });
    }
    
    // 按時間期間分組
    const trends = {};
    
    filteredLogs.forEach(log => {
      const rentDate = new Date(log.rent_time);
      let key;
      
      switch (period) {
        case 'day':
          key = rentDate.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(rentDate);
          weekStart.setDate(rentDate.getDate() - rentDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${rentDate.getFullYear()}-${String(rentDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = rentDate.toISOString().split('T')[0];
      }
      
      if (!trends[key]) {
        trends[key] = {
          period: key,
          rental_count: 0,
          unique_users: new Set(),
          unique_vehicles: new Set(),
          total_mileage: 0
        };
      }
      
      trends[key].rental_count++;
      trends[key].unique_users.add(log.user_id);
      trends[key].unique_vehicles.add(log.vehicle_id);
      
      if (log.mileage_after_driving && log.mileage_before_driving) {
        trends[key].total_mileage += (log.mileage_after_driving - log.mileage_before_driving);
      }
    });
    
    // 轉換Set為數量
    const trendData = Object.values(trends).map(trend => ({
      period: trend.period,
      rental_count: trend.rental_count,
      unique_users: trend.unique_users.size,
      unique_vehicles: trend.unique_vehicles.size,
      total_mileage: trend.total_mileage
    }));
    
    // 按期間排序
    trendData.sort((a, b) => new Date(a.period) - new Date(b.period));
    
    res.json({
      success: true,
      trends: trendData,
      period: period
    });
  } catch (err) {
    console.error('API 租借趨勢分析錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 用戶活動分析
router.get('/api/user-activity', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    
    const userActivity = users.map(user => {
      const userRentals = rentalLogs.filter(log => log.user_id === user.userID);
      
      // 計算用戶統計
      let totalMileage = 0;
      let totalRentalTime = 0;
      
      userRentals.forEach(rental => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          totalMileage += (rental.mileage_after_driving - rental.mileage_before_driving);
        }
        
        if (rental.return_time && rental.rent_time) {
          const rentalDuration = new Date(rental.return_time) - new Date(rental.rent_time);
          totalRentalTime += rentalDuration;
        }
      });
      
      return {
        user_id: user.userID,
        user_name: user.name,
        phone: user.phone_num,
        is_admin: user.isAdmin,
        total_rentals: userRentals.length,
        total_mileage: totalMileage,
        average_rental_time: userRentals.length > 0 ? totalRentalTime / userRentals.length : 0,
        last_rental_date: userRentals.length > 0 ? 
          userRentals[userRentals.length - 1].rent_time : null,
        active_rentals: userRentals.filter(log => !log.return_time).length
      };
    });
    
    // 按租借次數排序
    userActivity.sort((a, b) => b.total_rentals - a.total_rentals);
    
    res.json({
      success: true,
      user_activity: userActivity
    });
  } catch (err) {
    console.error('API 用戶活動分析錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;