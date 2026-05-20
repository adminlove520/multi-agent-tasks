const fs = require('fs');
const path = require('path');

const agentsJson = process.argv[2] || path.join(__dirname, '..', 'agents.json');
const tokenVar = process.env.TOKEN_VAR || 'TOKEN';

const data = JSON.parse(fs.readFileSync(agentsJson, 'utf8'));
const agents = data.agents.filter(a => a.role !== 'commander');

console.log('==========================================');
console.log('Multi-Agent Cron 配置生成器');
console.log('==========================================');
console.log('');

agents.forEach(agent => {
  const name = agent.name;
  const slug = agent.slug;
  const framework = agent.framework;
  const role = agent.role;
  
  console.log('-------------------------------------------');
  console.log('Agent:', name, '(' + slug + ')');
  console.log('Framework:', framework);
  console.log('Role:', role);
  console.log('');
  
  if (framework === 'openclaw') {
    console.log('# OpenClaw cron:');
    console.log('openclaw cron add \\');
    console.log('  --name "' + name + '" \\');
    console.log('  --cron "*/5 * * * *" \\');
    console.log('  --session isolated \\');
    console.log('  --message "cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh \\"$' + tokenVar + '\\" \\"' + slug + '\\"" \\');
    console.log('  --announce --channel telegram --to "@' + slug + 'bot"');
  } else if (framework === 'hermes') {
    console.log('# Hermes cron:');
    console.log('hermes cron add \\');
    console.log('  --name "' + name + '" \\');
    console.log('  --cron "*/5 * * * *" \\');
    console.log('  --command "cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh \\"$' + tokenVar + '\\" \\"' + slug + '\\""');
  } else {
    console.log('# Unknown framework:', framework);
    console.log('# 请手动配置', name, '的 cron');
  }
  console.log('');
});

console.log('==========================================');
console.log('复制上面的命令到你的框架中执行');
console.log('==========================================');