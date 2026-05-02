export const translations = {
  en: {
    title: "Task Dashboard",
    new_task: "New Task",
    sign_out: "Sign Out",
    sign_in: "Sign in with GitHub",
    welcome: "Multi-Agent Task Hub",
    please_sign_in: "Please sign in with GitHub to manage tasks",
    create_title: "Create New Task",
    task_title: "Title",
    priority: "Priority",
    skill: "Assigned Skill",
    instructions: "Instructions",
    cancel: "Cancel",
    create: "Create Task",
    creating: "Creating...",
    no_tasks: "No tasks found. Create one to get started!",
    connected_to: "Connected to",
    tabs: {
      tasks: "Tasks",
      agents: "Agents",
      skills: "Skills",
      sub: {
        all: "All",
        open: "Todo",
        processing: "In Progress",
        done: "Completed"
      }
    },
    agents: {
      title: "Agent Configuration",
      add: "Add Agent",
      name: "Agent Name",
      role: "Role",
      tg_token: "TG Bot Token (Optional)",
      save: "Save Config",
    },
    skills: {
      title: "Available Skills",
      install: "Install via CLI",
      copy: "Copy Command",
    }
  },
  zh: {
    title: "任务看板",
    new_task: "新建任务",
    sign_out: "退出登录",
    sign_in: "使用 GitHub 登录",
    welcome: "多智能体任务中心",
    please_sign_in: "请使用 GitHub 登录以管理任务",
    create_title: "创建新任务",
    task_title: "标题",
    priority: "优先级",
    skill: "指派技能",
    instructions: "执行指令",
    cancel: "取消",
    create: "创建任务",
    creating: "创建中...",
    no_tasks: "未找到任务。创建一个来开始吧！",
    connected_to: "已连接至",
    tabs: {
      tasks: "任务列表",
      agents: "智能体配置",
      skills: "技能库",
      sub: {
        all: "全部",
        open: "待处理",
        processing: "进行中",
        done: "已完成"
      }
    },
    agents: {
      title: "智能体身份配置",
      add: "添加智能体",
      name: "智能体名称",
      role: "角色身份",
      tg_token: "TG Bot Token (可选)",
      save: "保存配置",
    },
    skills: {
      title: "可用技能",
      install: "通过 CLI 安装",
      copy: "复制命令",
    }
  },
};

export type Locale = keyof typeof translations;
