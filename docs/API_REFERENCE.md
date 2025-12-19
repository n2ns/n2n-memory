# N2N Memory API 参数参考手册

本项目提供了一套基于项目本地路径的知识图谱管理工具。所有工具均要求传入 `projectPath` 以确保记忆的物理隔离。

## 核心工具集

### 1. `project_add_entities`
向项目的知识图谱中添加新的实体（名词/概念）。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。
- `entities` (Array): 实体对象列表。
    - `name` (string): 实体名称（唯一标识）。
    - `entityType` (string): 实体类型（如：CONCEPT, COMPONENT, BUG）。
    - `observations` (string[]): 关于该实体的观测事实。

**逻辑描述:**
- 如果实体名称已存在，将合并 `observations` 并自动去重。
- 写入前会对实体名称进行字典序排序。

---

### 2. `project_add_observations`
为已存在的实体追加新的发现或事实。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。
- `observations` (Array):
    - `entityName` (string): 目标实体名称。
    - `contents` (string[]): 要追加的事实列表。

**逻辑描述:**
- 仅当实体存在时才会添加。
- 自动对 observation 内容执行字典序排序及去重。

---

### 3. `project_create_relations`
在实体之间建立逻辑关系（谓词）。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。
- `relations` (Array):
    - `from` (string): 源实体名称。
    - `to` (string): 目标实体名称。
    - `relationType` (string): 关系类型（如：DEPENDS_ON, IMPLEMENTS）。

**逻辑描述:**
- 自动过滤完全重复的关系定义，防止数据冗余。

---

### 4. `project_read_graph`
读取指定项目的完整知识图谱。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。

**返回:**
- 包含 `entities` 和 `relations` 的标准 JSON 对象。

---

## 数据存储规范
- **路径**: `.mcp/memory.json`
- **格式**: 2 空格缩进的 JSON。
- **排序策略**: 
    - 实体：按 `name` 排序。
    - 关系：按 `from` -> `to` -> `type` 排序。
    - 观测：按字母序排序。
