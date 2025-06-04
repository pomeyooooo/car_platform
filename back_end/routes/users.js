const express = require('express');
const router = express.Router();
const db = require('../config/jsonDB');

// 獲取所有用戶 (管理介面)
router.get('/', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    
    // 為每個用戶計算統計資料
    const usersWithStats = users.map(user => {
      const userRentals = rentalLogs.filter(log => log.user_id === user.userID);
      const completedRentals = userRentals.filter(log => log.return_time);
      const activeRentals = userRentals.filter(log => !log.return_time);
      
      // 計算總行駛里程
      const totalMileage = completedRentals.reduce((total, rental) => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          return total + (rental.mileage_after_driving - rental.mileage_before_driving);
        }
        return total;
      }, 0);
      
      // 計算使用問題率
      const rentalsWithIssues = completedRentals.filter(rental => 
        rental.has_issues || rental.has_issues_return
      ).length;
      const issueRate = completedRentals.length > 0 ? 
        ((rentalsWithIssues / completedRentals.length) * 100).toFixed(1) : 0;
      
      return {
        ...user,
        total_rentals: userRentals.length,
        completed_rentals: completedRentals.length,
        active_rentals: activeRentals.length,
        total_mileage: totalMileage,
        issue_rate: issueRate,
        last_rental_date: userRentals.length > 0 ? 
          new Date(Math.max(...userRentals.map(r => new Date(r.rent_time)))).toLocaleDateString() : 
          '從未使用'
      };
    });
    
    res.render('dashboard/users', { users: usersWithStats });
  } catch (err) {
    console.error('獲取用戶列表錯誤:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// API: 獲取所有用戶
router.get('/api/list', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    
    const usersWithStats = users.map(user => {
      const userRentals = rentalLogs.filter(log => log.user_id === user.userID);
      const completedRentals = userRentals.filter(log => log.return_time);
      const activeRentals = userRentals.filter(log => !log.return_time);
      
      const totalMileage = completedRentals.reduce((total, rental) => {
        if (rental.mileage_after_driving && rental.mileage_before_driving) {
          return total + (rental.mileage_after_driving - rental.mileage_before_driving);
        }
        return total;
      }, 0);
      
      const rentalsWithIssues = completedRentals.filter(rental => 
        rental.has_issues || rental.has_issues_return
      ).length;
      const issueRate = completedRentals.length > 0 ? 
        ((rentalsWithIssues / completedRentals.length) * 100).toFixed(1) : 0;
      
      return {
        userID: user.userID,
        name: user.name,
        phone_num: user.phone_num,
        isAdmin: user.isAdmin,
        total_rentals: userRentals.length,
        completed_rentals: completedRentals.length,
        active_rentals: activeRentals.length,
        total_mileage: totalMileage,
        issue_rate: parseFloat(issueRate),
        last_rental_date: userRentals.length > 0 ? 
          new Date(Math.max(...userRentals.map(r => new Date(r.rent_time)))).toISOString() : 
          null
      };
    });
    
    res.json({ success: true, users: usersWithStats });
  } catch (err) {
    console.error('API 獲取用戶列表錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取特定用戶詳細資訊
router.get('/api/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const users = await db.getAllUsers();
    const user = users.find(u => u.userID === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '找不到用戶' });
    }
    
    const rentalLogs = await db.getAllRentalLogs();
    const userRentals = rentalLogs.filter(log => log.user_id === userId);
    const completedRentals = userRentals.filter(log => log.return_time);
    const activeRentals = userRentals.filter(log => !log.return_time);
    
    // 計算詳細統計
    const totalMileage = completedRentals.reduce((total, rental) => {
      if (rental.mileage_after_driving && rental.mileage_before_driving) {
        return total + (rental.mileage_after_driving - rental.mileage_before_driving);
      }
      return total;
    }, 0);
    
    const rentalsWithIssues = completedRentals.filter(rental => 
      rental.has_issues || rental.has_issues_return
    );
    
    const issueRate = completedRentals.length > 0 ? 
      ((rentalsWithIssues.length / completedRentals.length) * 100).toFixed(1) : 0;
    
    // 最近的租借記錄
    const recentRentals = userRentals
      .sort((a, b) => new Date(b.rent_time) - new Date(a.rent_time))
      .slice(0, 10);
    
    const userDetail = {
      ...user,
      password: undefined, // 不返回密碼
      statistics: {
        total_rentals: userRentals.length,
        completed_rentals: completedRentals.length,
        active_rentals: activeRentals.length,
        total_mileage: totalMileage,
        issue_rate: parseFloat(issueRate),
        rentals_with_issues: rentalsWithIssues.length
      },
      recent_rentals: recentRentals,
      active_rentals: activeRentals
    };
    
    res.json({ success: true, user: userDetail });
  } catch (err) {
    console.error('API 獲取用戶詳細資訊錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 新增用戶
router.post('/api/create', async (req, res) => {
  try {
    const { name, password, phone_num, isAdmin } = req.body;
    
    if (!name || !password || !phone_num) {
      return res.status(400).json({ success: false, message: '缺少必要欄位' });
    }
    
    const users = await db.getAllUsers();
    
    // 檢查手機號碼是否已存在
    const existingUser = users.find(u => u.phone_num === phone_num);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '手機號碼已存在' });
    }
    
    // 生成新的用戶ID
    const newUserId = users.length > 0 ? Math.max(...users.map(u => u.userID)) + 1 : 1;
    
    // 暫時不加密密碼，使用明文
    const hashedPassword = password;
    
    const newUser = {
      userID: newUserId,
      name,
      password: hashedPassword,
      phone_num,
      isAdmin: isAdmin || false
    };
    
    users.push(newUser);
    
    const dbData = await db.readDb();
    dbData.users = users;
    await db.writeDb(dbData);
    
    res.json({ 
      success: true, 
      message: '用戶創建成功',
      user: {
        userID: newUser.userID,
        name: newUser.name,
        phone_num: newUser.phone_num,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (err) {
    console.error('API 創建用戶錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 更新用戶資訊
router.put('/api/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { name, phone_num, isAdmin, password } = req.body;
    
    const dbData = await db.readDb();
    const users = dbData.users;
    const userIndex = users.findIndex(u => u.userID === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '找不到用戶' });
    }
    
    // 檢查手機號碼是否與其他用戶重複
    if (phone_num) {
      const existingUser = users.find(u => u.phone_num === phone_num && u.userID !== userId);
      if (existingUser) {
        return res.status(400).json({ success: false, message: '手機號碼已被其他用戶使用' });
      }
    }
    
    // 更新用戶資訊
    if (name) users[userIndex].name = name;
    if (phone_num) users[userIndex].phone_num = phone_num;
    if (typeof isAdmin === 'boolean') users[userIndex].isAdmin = isAdmin;
    
    // 如果提供新密碼，暫時使用明文
    if (password) {
      users[userIndex].password = password;
    }
    
    await db.writeDb(dbData);
    
    res.json({ 
      success: true, 
      message: '用戶資訊更新成功',
      user: {
        userID: users[userIndex].userID,
        name: users[userIndex].name,
        phone_num: users[userIndex].phone_num,
        isAdmin: users[userIndex].isAdmin
      }
    });
  } catch (err) {
    console.error('API 更新用戶錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 刪除用戶
router.delete('/api/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const dbData = await db.readDb();
    const users = dbData.users;
    const userIndex = users.findIndex(u => u.userID === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '找不到用戶' });
    }
    
    // 檢查用戶是否有未完成的租借
    const rentalLogs = dbData.rental_logs || [];
    const activeRentals = rentalLogs.filter(log => log.user_id === userId && !log.return_time);
    
    if (activeRentals.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '無法刪除有未完成租借的用戶' 
      });
    }
    
    // 刪除用戶
    users.splice(userIndex, 1);
    await db.writeDb(dbData);
    
    res.json({ success: true, message: '用戶已刪除' });
  } catch (err) {
    console.error('API 刪除用戶錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 用戶登入驗證
router.post('/api/login', async (req, res) => {
  try {
    const { phone_num, password } = req.body;
    
    if (!phone_num || !password) {
      return res.status(400).json({ success: false, message: '請提供手機號碼和密碼' });
    }
    
    const users = await db.getAllUsers();
    const user = users.find(u => u.phone_num === phone_num);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '用戶不存在' });
    }
    
    // 暫時使用明文比較
    const isValidPassword = password === user.password;
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '密碼錯誤' });
    }
    
    // 返回用戶資訊（不包含密碼）
    res.json({ 
      success: true, 
      message: '登入成功',
      user: {
        userID: user.userID,
        name: user.name,
        phone_num: user.phone_num,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('API 用戶登入錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// API: 獲取用戶統計報告
router.get('/api/stats/summary', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const rentalLogs = await db.getAllRentalLogs();
    
    const totalUsers = users.length;
    const adminUsers = users.filter(u => u.isAdmin).length;
    const regularUsers = totalUsers - adminUsers;
    
    // 活躍用戶（最近30天有租借記錄）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = new Set(
      rentalLogs
        .filter(log => new Date(log.rent_time) >= thirtyDaysAgo)
        .map(log => log.user_id)
    ).size;
    
    // 當前有活躍租借的用戶
    const usersWithActiveRentals = new Set(
      rentalLogs
        .filter(log => !log.return_time)
        .map(log => log.user_id)
    ).size;
    
    res.json({
      success: true,
      stats: {
        total_users: totalUsers,
        admin_users: adminUsers,
        regular_users: regularUsers,
        active_users_30_days: activeUsers,
        users_with_active_rentals: usersWithActiveRentals
      }
    });
  } catch (err) {
    console.error('API 獲取用戶統計錯誤:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;