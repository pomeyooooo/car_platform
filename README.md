# 智慧車輛管理平台 (Car Platform)

博幼基金會智慧車輛管理平台是一個專為非營利組織設計的數位化車輛租借與管理系統，旨在提升車輛管理透明度、安全性與效率。

## 📋 專案概述

### 系統目標
- **財務透明化與成本控制**：透過精確記錄里程數變化，為預算編列提供可靠依據
- **車輛維護與風險預防**：建立自動追蹤與預警機制，提醒定期保養與檢查需求
- **最佳化資源分配**：分析車輛使用頻率與平均出車距離，實現車輛使用的最佳化規劃
- **完善的責任與審核機制**：記錄詳細的出車責任人資訊，為稽核與外部審查提供可驗證的數據依據

### 主要功能
- 🚗 **車輛租借登記與狀態追蹤**
- 📱 **QR Code 掃描借車**
- 📸 **里程數記錄與拍照驗證**
- ⚠️ **即時異常與油量回報**
- 🔧 **維護與保養紀錄查詢**
- 📊 **行政稽核與資料佐證**
- 📈 **報表分析與統計**

## 🏗️ 系統架構

本專案採用前後端分離架構：

```
car_platform/
├── front_end/                 # 前端應用 (React)
│   └── my-app/
│       ├── src/
│       │   ├── VehicleManagementApp.jsx  # 主應用組件
│       │   ├── App.js
│       │   └── index.js
│       ├── public/
│       └── package.json
├── back_end/                  # 後端應用 (Node.js + Express)
│   ├── app.js                 # 主應用入口
│   ├── config/
│   │   └── jsonDB.js          # JSON 資料庫配置
│   ├── routes/                # API 路由
│   │   ├── user.js
│   │   ├── vehicle.js
│   │   ├── rental.js
│   │   ├── maintenance.js
│   │   ├── users.js
│   │   └── reports.js
│   ├── views/                 # EJS 模板
│   │   └── dashboard/
│   ├── public/                # 靜態文件
│   └── package.json
├── database.json              # JSON 資料庫
└── start-servers.sh           # 啟動腳本
```

### 技術棧

**前端**
- React 19.1.0
- Tailwind CSS 4.1.7
- Lucide React (圖標庫)
- Bootstrap 4 (管理介面)

**後端**
- Node.js + Express 5.1.0
- EJS 模板引擎
- JSON 檔案資料庫
- Chart.js (圖表)
- Express FileUpload (檔案上傳)

**其他工具**
- QR Code 生成與掃描
- 照片上傳與存儲
- 資料匯出功能

## 🚀 環境需求

- Node.js 18.0+ 
- npm 8.0+
- 現代瀏覽器 (Chrome, Firefox, Safari, Edge)

## 📦 安裝與設置

### 1. 複製專案
```bash
git clone <repository-url>
cd car_platform
```

### 2. 安裝後端依賴
```bash
cd back_end
npm install
```

### 3. 安裝前端依賴
```bash
cd ../front_end/my-app
npm install
```

### 4. 初始化資料庫
專案會自動創建 `database.json` 檔案，包含預設的測試資料：

**預設管理員帳號：**
- 用戶名：`admin`
- 密碼：`admin123`
- 手機：`0912345678`

**預設一般用戶：**
- 用戶名：`user`
- 密碼：`user123`
- 手機：`0987654321`

## 🏃‍♂️ 啟動應用

### 方法一：使用啟動腳本 (推薦)
```bash
# 在專案根目錄下執行
chmod +x start-servers.sh
./start-servers.sh
```

### 方法二：手動啟動

**啟動後端服務**
```bash
cd back_end
npm start
# 或開發模式
npm run dev
```

**啟動前端服務**
```bash
cd front_end/my-app
npm start
```

### 服務地址
- **後端管理介面**：http://localhost:3000
- **前端用戶介面**：http://localhost:3001

## 💻 使用說明

### 管理端使用 (http://localhost:3000)

1. **登入系統**
   - 訪問 http://localhost:3000
   - 使用預設管理員帳號登入

2. **儀表板**
   - 查看系統總覽與統計資料
   - 監控車輛狀態分布
   - 檢視最近租借記錄

3. **車輛管理**
   - 新增、編輯、刪除車輛
   - 查看車輛詳細資訊
   - 監控車輛使用狀況

4. **借還車記錄**
   - 查看所有租借記錄
   - 處理借車歸還
   - 生成租借報表

5. **維修保養**
   - 設定保養間隔與警告閾值
   - 記錄維護完成
   - 查看維護歷史記錄

6. **用戶管理**
   - 新增、編輯用戶
   - 查看用戶活動統計
   - 管理用戶權限

7. **報表分析**
   - 系統總覽統計
   - 車輛使用情況分析
   - 用戶活動報告

### 用戶端使用 (http://localhost:3001)

1. **登入**
   - 輸入帳號密碼登入系統

2. **掃描 QR Code**
   - 點擊「開始掃描QR碼」
   - 對準車輛 QR Code 進行掃描

3. **借車流程**
   - 輸入當前里程數
   - 拍攝里程表照片
   - 選擇油量狀態
   - 回報車輛異常（如有）
   - 確認借車

4. **還車流程**
   - 選擇要歸還的車輛
   - 輸入歸還里程數
   - 拍攝里程表照片
   - 選擇油量狀態
   - 回報使用中發現的問題（如有）
   - 確認還車

## 🔧 開發說明

### 後端 API 端點

**用戶相關**
- `POST /user/login` - 用戶登入
- `GET /users/api/list` - 獲取用戶列表
- `POST /users/api/create` - 創建新用戶

**車輛相關**
- `GET /vehicles/api/vehicles` - 獲取車輛列表
- `POST /vehicles/add` - 新增車輛
- `GET /vehicles/details/:id` - 獲取車輛詳情

**租借相關**
- `POST /rentals/api/borrow` - 借車請求
- `POST /rentals/api/return` - 還車請求
- `GET /rentals/api/vehicle/:license_plate` - 獲取車輛資訊

**維護相關**
- `GET /maintenance/api/records` - 獲取維護記錄
- `POST /maintenance/api/complete` - 完成維護記錄

**報表相關**
- `GET /reports/api/system-overview` - 系統總覽
- `GET /reports/api/vehicle-usage` - 車輛使用情況

### 資料庫結構

專案使用 JSON 檔案作為資料庫，主要資料表：

```json
{
  "users": [],          // 用戶資料
  "vehicles": [],       // 車輛資料
  "rental_logs": [],    // 租借記錄
  "breakdown_logs": [], // 故障記錄
  "maintenance_logs": [] // 維護記錄
}
```

## 🛠️ 故障排除

### 常見問題

1. **端口被占用**
   ```bash
   # 檢查端口使用情況
   lsof -i :3000
   lsof -i :3001
   
   # 終止佔用進程
   kill -9 <PID>
   ```

2. **依賴安裝失敗**
   ```bash
   # 清除 npm 緩存
   npm cache clean --force
   
   # 刪除 node_modules 重新安裝
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **資料庫初始化問題**
   - 刪除 `database.json` 檔案，重新啟動後端即可自動重建

4. **跨域請求問題**
   - 確保後端 CORS 設定正確
   - 檢查前端 API 請求 URL

### 日誌檢查

**後端日誌**
```bash
# 查看後端運行日誌
cd back_end
tail -f backend.log
```

**前端日誌**
```bash
# 查看前端運行日誌
cd front_end/my-app
tail -f frontend.log
```

## 📄 授權

本專案由清華大學資工系偏鄉智慧醫療專題團隊開發，專為博幼基金會車輛管理需求設計。

## 👥 開發團隊

- **專案經理**：李佑宸
- **後端工程師**：楊承霖、張博翔
- **資料庫工程師**：賴亭雲
- **前端工程師**：郭光輝

## 📞 技術支援

如有技術問題或建議，請聯繫開發團隊或提交 Issue。

---

**版本**：v1.0.0  
**最後更新**：2025年6月6日