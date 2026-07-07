# 代码约定

## TypeScript 约定

### 类型定义
- 使用 interface 定义对象类型
- 使用 type 定义联合类型
- 使用 enum 定义常量集合
- 避免使用 any，使用 unknown

### 函数定义
- 使用箭头函数
- 参数使用解构
- 返回值类型明确
- 使用 async/await 处理异步

### 错误处理
- 使用 try-catch 捕获错误
- 使用自定义错误类型
- 记录错误日志
- 提供用户友好提示

## React 约定

### 组件定义
- 使用函数组件
- 使用 TypeScript 定义 Props
- 使用 React.FC 类型
- 导出使用 default export

### Hooks 使用
- useState 管理组件状态
- useEffect 处理副作用
- useCallback 缓存函数
- useMemo 缓存计算结果
- useRef 访问 DOM

### 事件处理
- 使用 useCallback 缓存处理函数
- 避免内联函数
- 正确处理事件类型

## CSS 约定

### Tailwind CSS
- 使用语义化类名
- 避免内联样式
- 使用 CSS 变量管理主题
- 响应式设计使用断点

### 命名约定
- 组件样式使用 BEM 命名
- 工具类使用 Tailwind 类名
- 自定义属性使用 data-*

## 测试约定

### 单元测试
- 文件命名: xxx.test.ts
- 描述使用中文
- 测试独立性
- Mock 外部依赖

### 组件测试
- 文件命名: xxx.test.tsx
- 测试用户交互
- 测试边界情况
- 使用 screen 查询

### E2E 测试
- 文件命名: xxx.spec.ts
- 测试完整流程
- 使用 Page Object 模式
- 等待策略明确

## 注释规范

### 文件头注释
```typescript
// 文件名: xxx.ts
// 描述: 文件功能说明
// 创建时间: YYYY-MM-DD
// 作者: xxx
```

### 函数注释
```typescript
/**
 * 函数功能说明
 * @param 参数名 - 参数说明
 * @returns 返回值说明
 */
```

### 复杂逻辑注释
```typescript
// 注释说明：为什么这样做
// 而不是：做了什么
```

## 错误处理规范

### 前端错误处理
```typescript
try {
  // 业务逻辑
} catch (err) {
  logger.error('Tag', 'Error message:', err)
  // 用户友好提示
  setError('操作失败，请稍后重试')
}
```

### 后端错误处理
```typescript
try {
  // 业务逻辑
} catch (err) {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
}
```

## 命名规范

### 变量命名
- 普通变量: camelCase
- 常量: UPPER_SNAKE_CASE
- 布尔值: is/has/can 前缀
- 数组: 复数名词

### 函数命名
- 普通函数: camelCase
- 事件处理: handle 前缀
- 获取数据: get/fetch 前缀
- 设置数据: set 前缀

### 组件命名
- 组件: PascalCase
- Props: 接口名 + Props 后缀
- Hooks: use 前缀
