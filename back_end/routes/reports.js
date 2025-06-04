const express = require('express');
const router = express.Router();
const db = require('../config/jsonDB');

// 顯示報表頁面
router.get('/', async (req, res) => {
  try {
    res.render('dashboard/reports');
  } catch (err) {
    console.error('載入報表頁面錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 獲取綜合報告 API
router.get('/api/overview', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    const dbData = await db.readDb();
    const maintenanceLogs = dbData.maintenance_logs || [];
    const breakdownLogs = dbData.breakdown_logs || [];

    // 計算基本統計
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
    const brokenVehicles = vehicles.filter(v => v.status === 'broken').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

    const totalUsers = users.length;
    const adminUsers = users.filter(u => u.isAdmin).length;
    const regularUsers = totalUsers - adminUsers;

    // 租借統計
    const totalRentals = rentalLogs.length;
    const completedRentals = rentalLogs.filter(log => log.return_time).length;
    const activeRentals = rentalLogs.filter(log => !log.return_time).length;

    // 維護統計
    const totalMaintenanceRecords = maintenanceLogs.length;
    const totalBreakdowns = breakdownLogs.length;

    res.json({
      success: true,
      vehicle_stats: {
        total: totalVehicles,
        available: availableVehicles,
        rented: rentedVehicles,
        broken: brokenVehicles,
        maintenance: maintenanceVehicles
      },
      user_stats: {
        total: totalUsers,
        admin: adminUsers,
        regular: regularUsers
      },
      rental_stats: {
        total: totalRentals,
        completed: completedRentals,
        active: activeRentals
      },
      maintenance_stats: {
        total: totalMaintenanceRecords,
        breakdowns: totalBreakdowns
      }
    });
  } catch (err) {
    console.error('獲取報告錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// API: 獲取車輛使用報告
router.get('/api/vehicle-usage', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const vehicles = await db.getAllVehicles();
    const rentalLogs = await db.getAllRentalLogs();

    let filteredLogs = rentalLogs;
    if (start_date && end_date) {
      filteredLogs = rentalLogs.filter(log => {
        const rentDate = new Date(log.rent_time);
        return rentDate >= new Date(start_date) && rentDate <= new Date(end_date);
      });
    }

    const vehicleUsage = vehicles.map(vehicle => {
      const vehicleRentals = filteredLogs.filter(log => log.license_plate === vehicle.license_plate);
      const completedRentals = vehicleRentals.filter(log => log.return_time);
      
      // 計算總使用時間（小時）
      const totalUsageTime = completedRentals.reduce((total, rental) => {
        if (rental.return_time) {
          const rentTime = new Date(rental.rent_time);
          const returnTime = new Date(rental.return_time);
          const diffHours = (returnTime - rentTime) / (1000 * 60 * 60);
          return total + diffHours;
        }
        return total;
      }, 0);

      // 計算總行駛里程
      const totalMileage = completedRentals.reduce((total, rental) => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          return total + (rental.mileage_after_driving - rental.mileage_before_driving);
        }
        return total;
      }, 0);

      // 計算問題率
      const rentalsWithIssues = vehicleRentals.filter(rental => 
        rental.has_issues || rental.has_issues_return
      ).length;
      const issueRate = vehicleRentals.length > 0 ? 
        ((rentalsWithIssues / vehicleRentals.length) * 100).toFixed(1) : 0;

      return {
        license_plate: vehicle.license_plate,
        status: vehicle.status,
        current_mileage: vehicle.mileage,
        total_rentals: vehicleRentals.length,
        completed_rentals: completedRentals.length,
        total_usage_hours: Math.round(totalUsageTime * 10) / 10,
        total_driven_mileage: totalMileage,
        issue_rate: parseFloat(issueRate),
        utilization_rate: vehicleRentals.length > 0 ? 
          ((completedRentals.length / vehicleRentals.length) * 100).toFixed(1) : 0
      };
    });

    res.json({ success: true, vehicle_usage: vehicleUsage });
  } catch (err) {
    console.error('API 獲取車輛使用報告錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取用戶行為報告
router.get('/api/user-behavior', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();

    let filteredLogs = rentalLogs;
    if (start_date && end_date) {
      filteredLogs = rentalLogs.filter(log => {
        const rentDate = new Date(log.rent_time);
        return rentDate >= new Date(start_date) && rentDate <= new Date(end_date);
      });
    }

    const userBehavior = users.filter(user => !user.isAdmin).map(user => {
      const userRentals = filteredLogs.filter(log => log.user_id === user.userID);
      const completedRentals = userRentals.filter(log => log.return_time);

      // 計算平均租借時間
      const avgRentalTime = completedRentals.length > 0 ? 
        completedRentals.reduce((total, rental) => {
          const rentTime = new Date(rental.rent_time);
          const returnTime = new Date(rental.return_time);
          const diffHours = (returnTime - rentTime) / (1000 * 60 * 60);
          return total + diffHours;
        }, 0) / completedRentals.length : 0;

      // 計算總行駛里程
      const totalMileage = completedRentals.reduce((total, rental) => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          return total + (rental.mileage_after_driving - rental.mileage_before_driving);
        }
        return total;
      }, 0);

      // 計算問題率
      const rentalsWithIssues = userRentals.filter(rental => 
        rental.has_issues || rental.has_issues_return
      ).length;
      const issueRate = userRentals.length > 0 ? 
        ((rentalsWithIssues / userRentals.length) * 100).toFixed(1) : 0;

      // 找出最常使用的車輛
      const vehicleUsage = {};
      userRentals.forEach(rental => {
        if (vehicleUsage[rental.license_plate]) {
          vehicleUsage[rental.license_plate]++;
        } else {
          vehicleUsage[rental.license_plate] = 1;
        }
      });
      
      const favoriteVehicle = Object.keys(vehicleUsage).length > 0 ? 
        Object.keys(vehicleUsage).reduce((a, b) => vehicleUsage[a] > vehicleUsage[b] ? a : b) : null;

      return {
        userID: user.userID,
        name: user.name,
        phone_num: user.phone_num,
        total_rentals: userRentals.length,
        completed_rentals: completedRentals.length,
        avg_rental_hours: Math.round(avgRentalTime * 10) / 10,
        total_driven_mileage: totalMileage,
        issue_rate: parseFloat(issueRate),
        favorite_vehicle: favoriteVehicle,
        last_rental_date: userRentals.length > 0 ? 
          new Date(Math.max(...userRentals.map(r => new Date(r.rent_time)))).toISOString() : null
      };
    });

    // 按租借次數排序
    userBehavior.sort((a, b) => b.total_rentals - a.total_rentals);

    res.json({ success: true, user_behavior: userBehavior });
  } catch (err) {
    console.error('API 獲取用戶行為報告錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取維護報告
router.get('/api/maintenance-report', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const vehicles = await db.getAllVehicles();
    const dbData = await db.readDb();
    const maintenanceLogs = dbData.maintenance_logs || [];
    const breakdownLogs = dbData.breakdown_logs || [];

    let filteredMaintenanceLogs = maintenanceLogs;
    let filteredBreakdownLogs = breakdownLogs;

    if (start_date && end_date) {
      filteredMaintenanceLogs = maintenanceLogs.filter(log => {
        const maintenanceDate = new Date(log.maintenance_date);
        return maintenanceDate >= new Date(start_date) && maintenanceDate <= new Date(end_date);
      });

      filteredBreakdownLogs = breakdownLogs.filter(log => {
        const breakdownDate = new Date(log.breakdown_time);
        return breakdownDate >= new Date(start_date) && breakdownDate <= new Date(end_date);
      });
    }

    // 維護成本統計
    const totalMaintenanceCost = filteredMaintenanceLogs.reduce((total, log) => {
      return total + (parseFloat(log.cost) || 0);
    }, 0);

    // 按車輛統計維護情況
    const vehicleMaintenanceStats = vehicles.map(vehicle => {
      const vehicleMaintenanceLogs = filteredMaintenanceLogs.filter(log => 
        log.license_plate === vehicle.license_plate
      );
      const vehicleBreakdownLogs = filteredBreakdownLogs.filter(log => 
        log.license_plate === vehicle.license_plate
      );

      const maintenanceCost = vehicleMaintenanceLogs.reduce((total, log) => {
        return total + (parseFloat(log.cost) || 0);
      }, 0);

      return {
        license_plate: vehicle.license_plate,
        status: vehicle.status,
        current_mileage: vehicle.mileage,
        last_maintenance_date: vehicle.last_maintenance_date,
        maintenance_count: vehicleMaintenanceLogs.length,
        breakdown_count: vehicleBreakdownLogs.length,
        maintenance_cost: maintenanceCost,
        reliability_score: vehicleBreakdownLogs.length === 0 ? 100 : 
          Math.max(0, 100 - (vehicleBreakdownLogs.length * 10))
      };
    });

    // 維護類型統計
    const maintenanceTypes = {};
    filteredMaintenanceLogs.forEach(log => {
      if (maintenanceTypes[log.maintenance_type]) {
        maintenanceTypes[log.maintenance_type].count++;
        maintenanceTypes[log.maintenance_type].cost += parseFloat(log.cost) || 0;
      } else {
        maintenanceTypes[log.maintenance_type] = {
          count: 1,
          cost: parseFloat(log.cost) || 0
        };
      }
    });

    res.json({
      success: true,
      maintenance_report: {
        summary: {
          total_maintenance_records: filteredMaintenanceLogs.length,
          total_breakdown_records: filteredBreakdownLogs.length,
          total_maintenance_cost: totalMaintenanceCost,
          avg_cost_per_maintenance: filteredMaintenanceLogs.length > 0 ? 
            (totalMaintenanceCost / filteredMaintenanceLogs.length).toFixed(2) : 0
        },
        vehicle_stats: vehicleMaintenanceStats,
        maintenance_types: maintenanceTypes,
        recent_maintenances: filteredMaintenanceLogs.slice(-10),
        recent_breakdowns: filteredBreakdownLogs.slice(-10)
      }
    });
  } catch (err) {
    console.error('API 獲取維護報告錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取財務報告
router.get('/api/financial-report', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const rentalLogs = await db.getAllRentalLogs();
    const dbData = await db.readDb();
    const maintenanceLogs = dbData.maintenance_logs || [];

    let filteredRentalLogs = rentalLogs;
    let filteredMaintenanceLogs = maintenanceLogs;

    if (start_date && end_date) {
      filteredRentalLogs = rentalLogs.filter(log => {
        const rentDate = new Date(log.rent_time);
        return rentDate >= new Date(start_date) && rentDate <= new Date(end_date);
      });

      filteredMaintenanceLogs = maintenanceLogs.filter(log => {
        const maintenanceDate = new Date(log.maintenance_date);
        return maintenanceDate >= new Date(start_date) && maintenanceDate <= new Date(end_date);
      });
    }

    // 租借收入（假設有租借費用字段，如果沒有可以設定默認值）
    const rentalIncome = filteredRentalLogs.reduce((total, log) => {
      // 假設每小時租借費用為100元，根據實際情況調整
      if (log.return_time) {
        const rentTime = new Date(log.rent_time);
        const returnTime = new Date(log.return_time);
        const diffHours = (returnTime - rentTime) / (1000 * 60 * 60);
        return total + (diffHours * 100); // 每小時100元
      }
      return total;
    }, 0);

    // 維護成本
    const maintenanceCost = filteredMaintenanceLogs.reduce((total, log) => {
      return total + (parseFloat(log.cost) || 0);
    }, 0);

    // 淨利潤
    const netProfit = rentalIncome - maintenanceCost;

    // 按月份統計（如果有日期範圍）
    const monthlyStats = {};
    if (start_date && end_date) {
      const currentDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      while (currentDate <= endDate) {
        const monthKey = currentDate.toISOString().substring(0, 7); // YYYY-MM
        monthlyStats[monthKey] = {
          rental_income: 0,
          maintenance_cost: 0,
          rental_count: 0,
          maintenance_count: 0
        };
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      filteredRentalLogs.forEach(log => {
        if (log.return_time) {
          const monthKey = log.rent_time.substring(0, 7);
          if (monthlyStats[monthKey]) {
            const rentTime = new Date(log.rent_time);
            const returnTime = new Date(log.return_time);
            const diffHours = (returnTime - rentTime) / (1000 * 60 * 60);
            monthlyStats[monthKey].rental_income += diffHours * 100;
            monthlyStats[monthKey].rental_count++;
          }
        }
      });

      filteredMaintenanceLogs.forEach(log => {
        const monthKey = log.maintenance_date.substring(0, 7);
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].maintenance_cost += parseFloat(log.cost) || 0;
          monthlyStats[monthKey].maintenance_count++;
        }
      });
    }

    res.json({
      success: true,
      financial_report: {
        summary: {
          total_rental_income: Math.round(rentalIncome * 100) / 100,
          total_maintenance_cost: Math.round(maintenanceCost * 100) / 100,
          net_profit: Math.round(netProfit * 100) / 100,
          profit_margin: rentalIncome > 0 ? ((netProfit / rentalIncome) * 100).toFixed(2) : 0,
          total_completed_rentals: filteredRentalLogs.filter(log => log.return_time).length,
          avg_income_per_rental: filteredRentalLogs.filter(log => log.return_time).length > 0 ? 
            (rentalIncome / filteredRentalLogs.filter(log => log.return_time).length).toFixed(2) : 0
        },
        monthly_breakdown: monthlyStats
      }
    });
  } catch (err) {
    console.error('API 獲取財務報告錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取系統總覽
router.get('/api/system-overview', async (req, res) => {
  try {
    const vehicles = await db.getAllVehicles();
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    const dbData = await db.readDb();
    const maintenanceLogs = dbData.maintenance_logs || [];
    const breakdownLogs = dbData.breakdown_logs || [];

    // 今天的日期
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 最近7天的統計
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRentals = rentalLogs.filter(log => 
      new Date(log.rent_time) >= sevenDaysAgo
    );

    const recentMaintenances = maintenanceLogs.filter(log => 
      new Date(log.maintenance_date) >= sevenDaysAgo
    );

    // 需要注意的警告
    const alerts = [];
    
    vehicles.forEach(vehicle => {
      // 檢查維護逾期
      const mileageSinceLastMaintenance = vehicle.mileage - vehicle.last_maintainance_mileage;
      if (mileageSinceLastMaintenance > 5000) {
        alerts.push({
          type: 'maintenance_overdue',
          severity: 'high',
          message: `車輛 ${vehicle.license_plate} 已逾期保養`,
          license_plate: vehicle.license_plate
        });
      }
      
      // 檢查車輛狀態
      if (vehicle.status === 'broken') {
        alerts.push({
          type: 'vehicle_broken',
          severity: 'high',
          message: `車輛 ${vehicle.license_plate} 處於故障狀態`,
          license_plate: vehicle.license_plate
        });
      }
      
      if (vehicle.low_oil_volume) {
        alerts.push({
          type: 'low_oil',
          severity: 'medium',
          message: `車輛 ${vehicle.license_plate} 機油量過低`,
          license_plate: vehicle.license_plate
        });
      }
    });

    res.json({
      success: true,
      system_overview: {
        vehicle_summary: {
          total: vehicles.length,
          available: vehicles.filter(v => v.status === 'available').length,
          rented: vehicles.filter(v => v.status === 'rented').length,
          broken: vehicles.filter(v => v.status === 'broken').length,
          maintenance: vehicles.filter(v => v.status === 'maintenance').length
        },
        user_summary: {
          total: users.length,
          admin: users.filter(u => u.isAdmin).length,
          regular: users.filter(u => !u.isAdmin).length,
          active_users_7_days: new Set(recentRentals.map(r => r.user_id)).size
        },
        activity_summary: {
          total_rentals: rentalLogs.length,
          active_rentals: rentalLogs.filter(log => !log.return_time).length,
          rentals_last_7_days: recentRentals.length,
          maintenances_last_7_days: recentMaintenances.length
        },
        alerts: alerts,
        recent_activities: [
          ...recentRentals.slice(-5).map(log => ({
            type: 'rental',
            time: log.rent_time,
            description: `用戶 ${log.user_id} 租借車輛 ${log.license_plate}`,
            status: log.return_time ? 'completed' : 'active'
          })),
          ...recentMaintenances.slice(-3).map(log => ({
            type: 'maintenance',
            time: log.maintenance_date,
            description: `車輛 ${log.license_plate} 完成 ${log.maintenance_type}`,
            status: 'completed'
          }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
      }
    });
  } catch (err) {
    console.error('API 獲取系統總覽錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;