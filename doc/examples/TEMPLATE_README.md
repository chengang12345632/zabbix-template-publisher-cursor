# 业务监控项配置维护指南

本文档指导开发人员如何创建和维护业务监控项配置文件（`.properties`文件）。

---

## 1. 快速开始

### 1.1 创建配置文件

在项目的 `src/main/resources/zabbix/` 目录下创建配置文件：

**文件命名规则：**
```
{serviceName}_business_template.properties
```

**服务名称获取：**
- 自动从项目的 `pom.xml` 文件中读取 `<artifactId>` 标签值
- 如果项目没有 `pom.xml` 文件，需要手动指定服务名称

**示例：**
- 服务名称为 `base_alarm_service` → 文件名：`base_alarm_service_business_template.properties`
- 服务名称为 `base_gateway_service` → 文件名：`base_gateway_service_business_template.properties`

### 1.2 配置文件位置

```
项目根目录/
└── src/
    └── main/
        └── resources/
            └── zabbix/
                └── {serviceName}_business_template.properties  ← 在这里创建
```

---

## 2. 配置文件结构

### 2.1 基本结构

每个业务监控项配置文件包含以下部分：

```properties
# 1. 模板基本信息
zabbix.template="..."
zabbix.template.name="..."
zabbix.template.version="5.0"

# 2. 模板组信息
zabbix.groups[0].name="business_monitor"

# 3. 应用信息
zabbix.applications[0].name="..."

# 4. 模板依赖（必须）
zabbix.templates[0].name="master_prometheus_business_template"

# 5. 业务监控项配置
# - 静态监控项（zabbix.items[...]）
# - 或发现规则（zabbix.discovery[...]）
```

### 2.2 必需配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `zabbix.template` | 模板标识符 | `"base_alarm_service_business_template"` |
| `zabbix.template.name` | 模板显示名称 | `"base_alarm_service_business_template"` |
| `zabbix.template.version` | Zabbix版本 | `"5.0"` |
| `zabbix.groups[0].name` | 模板组名称 | `"business_monitor"` |
| `zabbix.applications[0].name` | 应用分组名称 | `"base_alarm_service"` |
| `zabbix.templates[0].name` | **必须依赖主监控项模板** | `"master_prometheus_business_template"` |

---

## 3. 配置场景

### 3.1 场景1：静态监控项（固定指标）

**适用场景：**
- 监控固定的业务指标
- 指标数量少且固定
- 不需要按维度动态创建监控项

**配置示例：**

```properties
# 业务监控项配置
zabbix.items[0].name="insertAlarmFailed"
zabbix.items[0].key="insertAlarmFailed"
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].value_type="FLOAT"
zabbix.items[0].delay="0"
# 关键：引用主监控项
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].preprocessing_type="PROMETHEUS_PATTERN"
zabbix.items[0].preprocessing_params="base_alarm_insertAlarmFailed{}"
zabbix.items[0].appName="base_alarm_service"
```

**配置说明：**

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `name` | 监控项显示名称 | 是 |
| `key` | 监控项唯一标识符 | 是 |
| `type` | 监控项类型，**必须为 `DEPENDENT`** | 是 |
| `value_type` | 值类型：`FLOAT`（浮点数）、`UINT64`（整数） | 是 |
| `delay` | 采集间隔，**必须为 `0`**（依赖主监控项） | 是 |
| `master_item` | **必须引用主监控项**：`master.prometheus[{$EXPORTTOOL_URL}]` | 是 |
| `preprocessing_type` | 预处理类型：`PROMETHEUS_PATTERN`（提取Prometheus指标） | 是 |
| `preprocessing_params` | 预处理参数：`{module}_{domain}{}` | 是 |
| `appName` | 应用分组名称 | 是 |

**完整示例：** 参考 [base_alarm_service_business_template.properties](base_alarm_service_business_template.properties)

### 3.2 场景2：发现规则（LLD - 多维度动态监控）

**适用场景：**
- 需要按多个维度动态创建监控项
- 维度包括：租户ID、应用ID、状态、URL等
- 监控项数量不固定，随数据动态变化

**配置示例：**

```properties
# ========== 低级别发现规则 ==========
zabbix.discovery[0].name="saas_server_deviceCount"
zabbix.discovery[0].key="saas_server_deviceCount.discovery"
zabbix.discovery[0].type="DEPENDENT"
zabbix.discovery[0].delay="0"
zabbix.discovery[0].lifetime="3d"
# 引用主监控项
zabbix.discovery[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
# 预处理：将 Prometheus 格式转换为 JSON（用于 LLD）
zabbix.discovery[0].preprocessing_type="PROMETHEUS_TO_JSON"
zabbix.discovery[0].preprocessing_params="saas_server_deviceCount{}"
# LLD 宏定义：定义要提取的标签
zabbix.discovery[0].lld_macros="APPID,COUNTTYPE,SOURCE,TENANTID,METRIC_NAME"
zabbix.discovery[0].appName="base_server_service"

# LLD 监控项原型：动态创建每个维度的监控项
zabbix.discovery[0].item_prototype.name="Device Count: [{#COUNTTYPE}] [appId:{#APPID}] [tenantId:{#TENANTID}]"
zabbix.discovery[0].item_prototype.key="saas_server_deviceCount[{#COUNTTYPE},{#APPID},{#TENANTID}]"
zabbix.discovery[0].item_prototype.type="DEPENDENT"
zabbix.discovery[0].item_prototype.value_type="FLOAT"
zabbix.discovery[0].item_prototype.delay="0"
zabbix.discovery[0].item_prototype.master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.discovery[0].item_prototype.preprocessing_type="PROMETHEUS_PATTERN"
zabbix.discovery[0].item_prototype.preprocessing_params="saas_server_deviceCount{appId=\"{#APPID}\",countType=\"{#COUNTTYPE}\",tenantId=\"{#TENANTID}\"}"
zabbix.discovery[0].item_prototype.appName="base_server_service"
```

**配置说明：**

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `discovery[0].name` | 发现规则名称 | 是 |
| `discovery[0].key` | 发现规则Key，**必须以 `.discovery` 结尾** | 是 |
| `discovery[0].type` | **必须为 `DEPENDENT`** | 是 |
| `discovery[0].lifetime` | 监控项生命周期，如 `3d`（3天） | 是 |
| `discovery[0].preprocessing_type` | **必须为 `PROMETHEUS_TO_JSON`** | 是 |
| `discovery[0].preprocessing_params` | Prometheus指标名称：`{module}_{domain}{}` | 是 |
| `discovery[0].lld_macros` | LLD宏列表，用逗号分隔，**必须包含 `METRIC_NAME`** | 是 |
| `item_prototype.*` | 监控项原型配置，使用 `{#MACRO}` 引用LLD宏 | 是 |

**完整示例：**
- 参考 [base_server_service_business_template.properties](base_server_service_business_template.properties) - 设备数量统计
- 参考 [base_gateway_service_business_template.properties](base_gateway_service_business_template.properties) - API调用统计

---

## 4. 关键配置说明

### 4.1 模板依赖（必须配置）

**所有业务监控项配置文件必须声明依赖主监控项模板：**

```properties
zabbix.templates[0].name="master_prometheus_business_template"
```

**原因：**
- 所有业务监控项都依赖主监控项 `master.prometheus[{$EXPORTTOOL_URL}]` 获取数据
- 主监控项由运维人员统一维护，各组件无需创建

### 4.2 主监控项引用（必须配置）

**所有监控项必须引用主监控项：**

```properties
master_item="master.prometheus[{$EXPORTTOOL_URL}]"
```

**说明：**
- `{$EXPORTTOOL_URL}` 是Zabbix宏，由运维人员在主机上配置
- 主监控项负责从ExporterTool获取Prometheus格式数据
- 业务监控项通过预处理从主监控项数据中提取特定指标

### 4.3 预处理参数格式

**静态监控项：**
```properties
preprocessing_params="base_alarm_insertAlarmFailed{}"
```
- 格式：`{module}_{domain}{}`
- `module`：服务组件名称（对应Kafka消息的 `m` 字段）
- `domain`：业务领域（对应Kafka消息的 `n` 字段）

**发现规则：**
```properties
preprocessing_params="saas_server_deviceCount{}"
```
- 格式：`{module}_{domain}{}`
- 用于LLD发现，返回JSON格式数据

**监控项原型：**
```properties
preprocessing_params="saas_server_deviceCount{appId=\"{#APPID}\",countType=\"{#COUNTTYPE}\",tenantId=\"{#TENANTID}\"}"
```
- 格式：`{module}_{domain}{label1="value1",label2="value2"}`
- 使用LLD宏 `{#MACRO}` 过滤特定维度的数据

### 4.4 LLD宏定义规则

**必须包含的宏：**
- `METRIC_NAME`：**必须包含**，用于标识指标名称

**常用宏：**
- `APPID`：应用ID
- `TENANTID`：租户ID
- `SOURCE`：数据来源IP
- `COUNTTYPE`：计数类型（如：online、total）
- `URL`：API路径
- `METHOD`：HTTP方法
- `STATE`：状态（如：success、fail）

**配置示例：**
```properties
lld_macros="APPID,COUNTTYPE,SOURCE,TENANTID,METRIC_NAME"
```

---

## 5. 配置验证

### 5.1 开发测试

**使用Cursor插件进行开发测试：**

1. 右键点击 `.properties` 文件
2. 选择 `🔧 开发测试 - 生成合并模板`
3. 插件会自动：
   - 验证配置文件格式
   - 生成XML模板
   - 合并所有模板
   - 导入到测试Zabbix环境

**验证检查项：**
- ✅ 配置文件格式正确
- ✅ 模板依赖配置正确
- ✅ 主监控项引用正确
- ✅ 预处理参数格式正确
- ✅ LLD宏定义正确（如使用发现规则）

### 5.2 验证监控项

**在Zabbix测试环境中验证：**

1. **检查模板导入**
   - 进入 `配置` → `模板`
   - 确认模板 `merged_business_template_dev` 已导入

2. **检查监控项**
   - 进入 `配置` → `主机` → 选择主机 → `监控项`
   - 确认业务监控项已创建
   - 对于LLD规则，确认监控项原型已自动创建

3. **检查数据采集**
   - 等待5-10分钟
   - 进入 `监测` → `最新数据`
   - 确认监控项有数据

---

## 6. 配置示例

### 6.1 静态监控项示例

**完整配置文件：** [base_alarm_service_business_template.properties](base_alarm_service_business_template.properties)

**特点：**
- 监控固定的业务指标
- 配置简单，适合指标数量少的场景

### 6.2 发现规则示例

**设备数量统计：** [base_server_service_business_template.properties](base_server_service_business_template.properties)

**特点：**
- 按租户、应用、类型等维度动态创建监控项
- 适合多维度监控场景

**API调用统计：** [base_gateway_service_business_template.properties](base_gateway_service_business_template.properties)

**特点：**
- 按URL、方法、状态等维度动态创建监控项
- 适合API监控场景

---

## 7. 常见问题

### Q1: 如何确定预处理参数中的指标名称？

**A:** 预处理参数格式为 `{module}_{domain}{}`，其中：
- `module`：对应Kafka消息中的 `m` 字段（服务组件名称）
- `domain`：对应Kafka消息中的 `n` 字段（业务领域）

**示例：**
- Kafka消息：`{"m": "base_alarm", "n": "insertAlarmFailed"}`
- 预处理参数：`base_alarm_insertAlarmFailed{}`

### Q2: LLD宏定义中必须包含哪些宏？

**A:** 必须包含 `METRIC_NAME`，其他宏根据实际业务需求选择。

**常用宏：**
- `METRIC_NAME`：**必须**
- `APPID`、`TENANTID`：多租户/多应用场景
- `SOURCE`：多数据源场景
- `URL`、`METHOD`、`STATE`：API监控场景

### Q3: 静态监控项和发现规则如何选择？

**A:** 
- **静态监控项**：指标数量固定且少（<10个），使用静态配置
- **发现规则**：需要按维度动态创建监控项，使用LLD发现规则

### Q4: 配置文件格式错误怎么办？

**A:** 
1. 检查必填配置项是否都已配置
2. 检查配置项格式是否正确（引号、逗号等）
3. 使用Cursor插件的开发测试功能验证
4. 查看详细日志了解具体错误

### Q5: 监控项没有数据怎么办？

**A:** 
1. 确认ExporterTool服务正常运行
2. 确认业务组件已推送监控数据到Kafka
3. 确认预处理参数中的指标名称正确
4. 确认主监控项有数据
5. 等待5-10分钟让数据采集生效

---

## 8. 最佳实践

### 8.1 配置文件命名

- ✅ 使用服务名称作为文件名前缀
- ✅ 统一使用 `_business_template.properties` 后缀
- ✅ 文件名与服务名称保持一致

### 8.2 配置项组织

- ✅ 按功能模块分组注释
- ✅ 使用清晰的注释说明每个监控项的作用
- ✅ 保持配置项顺序一致（基本信息 → 监控项 → 发现规则）

### 8.3 监控项设计

- ✅ 监控项名称清晰描述监控内容
- ✅ Key命名规范，避免冲突
- ✅ 合理使用应用分组（`appName`）组织监控项

### 8.4 发现规则设计

- ✅ LLD宏定义包含所有需要的维度
- ✅ 监控项原型名称清晰，包含关键维度信息
- ✅ 合理设置监控项生命周期（`lifetime`）

---

## 9. 相关资源

- **主监控项模板配置：** [master_prometheus_business_template.properties](master_prometheus_business_template.properties)（运维维护，仅供参考）
- **完整配置示例：**
  - [告警服务示例](base_alarm_service_business_template.properties)
  - [网关服务示例](base_gateway_service_business_template.properties)
  - [服务器服务示例](base_server_service_business_template.properties)
- **主文档：** [业务监控接入说明](../../README.md)
- **故障排查：** [故障排查与常见问题](../troubleshooting.md)

---

**最后更新：** 2025-01-22  
**版本：** v2.0  
**维护者：** 开发团队
