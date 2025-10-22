# Zabbix 模板示例文件说明

## 📁 目录结构

```
doc/examples/
├── base_alarm_service_business_template.properties     ← Alarm 服务配置
├── base_alarm_service_business_template.xml           ← Alarm 服务模板
├── base_gateway_service_business_template.properties  ← Gateway 服务配置
├── base_gateway_service_business_template.xml         ← Gateway 服务模板
├── base_server_service_business_template.properties   ← Server 服务配置
├── base_server_service_business_template.xml          ← Server 服务模板
├── master_prometheus_business_template.properties      ← 主监控项配置
├── master_prometheus_business_template.xml             ← 主监控项模板
└── merged_business_template.xml                        ← 合并模板（推荐使用）
```

---

## 🎯 文件说明

### 核心模板文件

#### 1. **主监控项模板**
- **`master_prometheus_business_template.properties`** - 主监控项配置文件
- **`master_prometheus_business_template.xml`** - 主监控项 XML 模板
- **用途：** 所有业务监控项的数据源，必须首先导入

#### 2. **业务服务模板**

**Alarm 服务：**
- **`base_alarm_service_business_template.properties`** - Alarm 服务配置
- **`base_alarm_service_business_template.xml`** - Alarm 服务模板
- **监控内容：** 告警相关业务指标

**Server 服务：**
- **`base_server_service_business_template.properties`** - Server 服务配置
- **`base_server_service_business_template.xml`** - Server 服务模板
- **监控内容：** 设备数量统计（LLD 动态发现）

**Gateway 服务：**
- **`base_gateway_service_business_template.properties`** - Gateway 服务配置
- **`base_gateway_service_business_template.xml`** - Gateway 服务模板
- **监控内容：** API 调用统计（LLD 动态发现）

#### 3. **合并模板（推荐）**
- **`merged_business_template.xml`** - 合并所有服务的模板
- **优势：** 解决模板重复链接问题，一个模板包含所有功能
- **推荐使用：** 生产环境建议使用此模板

---

## 🚀 使用方式

### 方式1：使用合并模板（推荐）

**步骤：**
1. 导入 `merged_business_template.xml`
2. 主机链接该模板
3. 配置 `{$EXPORTTOOL_URL}` 宏
4. 等待数据采集

**优势：**
- ✅ 解决重复链接问题
- ✅ 一个模板包含所有功能
- ✅ 简化主机配置

### 方式2：使用独立模板

**步骤：**
1. 先导入 `master_prometheus_business_template.xml`
2. 再导入各个业务服务模板
3. 主机链接所有需要的模板

**注意：**
- ⚠️ 可能遇到重复链接问题
- ⚠️ 需要手动管理模板依赖关系

---

## 📊 监控内容

### 主监控项
- **`master.prometheus[{$EXPORTTOOL_URL}]`** - Prometheus 数据采集

### Alarm 服务
- **`insertAlarmFailed`** - 告警插入失败次数
- **`repeatAlarmMsg`** - 重复告警消息次数

### Server 服务（LLD）
- **`Device Count: [online] [appId:X] [tenantId:Y]`** - 在线设备数
- **`Device Count: [total] [appId:X] [tenantId:Y]`** - 设备总数

### Gateway 服务（LLD）
- **`API Counter: [URL] [METHOD] [STATE]`** - API 调用次数统计

---

## 🔧 配置要求

### 必需配置
- **`{$EXPORTTOOL_URL}`** - ExporterTool 接口地址（如：127.0.0.1:21746）

### 数据源要求
- ExporterTool 服务必须运行
- 必须包含相应的 Prometheus 指标
- 网络连接正常

---

## 📋 导入顺序

### 使用合并模板
```
1. 导入 merged_business_template.xml
2. 主机链接该模板
3. 配置宏
4. 等待数据采集
```

### 使用独立模板
```
1. 导入 master_prometheus_business_template.xml
2. 导入 base_alarm_service_business_template.xml
3. 导入 base_server_service_business_template.xml
4. 导入 base_gateway_service_business_template.xml
5. 主机链接所有模板
```

---

## 🎯 推荐使用

**生产环境：** 使用 `merged_business_template.xml`
- 完全解决重复链接问题
- 简化管理和配置
- 包含所有业务监控功能

**开发测试：** 可以使用独立模板
- 便于单独测试某个服务
- 便于调试和开发

---

## 📝 注意事项

1. **模板依赖：** 所有业务模板都依赖主监控项模板
2. **LLD 发现：** Server 和 Gateway 使用 LLD 动态创建监控项
3. **数据采集：** 需要等待 5-10 分钟让 LLD 发现规则生效
4. **宏配置：** 确保 `{$EXPORTTOOL_URL}` 宏配置正确

---

**最后更新：** 2025-10-22
**版本：** v1.0.0
**状态：** 生产就绪
