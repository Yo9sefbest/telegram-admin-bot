const messages = {
  welcome: (name) => `Hi ${name}! 👋\nI'm a demo bot built with Node.js.\n\nUse /help to see what I can do.`,
  help: 'Commands:\n/start - say hello\n/help - show this message\n/feedback <text> - send feedback to the team',
  feedbackUsage: 'Please add your message, for example:\n/feedback I love this bot',
  feedbackTooLong: 'That message is too long. Please keep it under 1000 characters.',
  feedbackThanks: 'Thanks! Your feedback was sent to the team. ✅',
  banned: 'You are not allowed to use this bot.',
  notAdmin: 'This command is for admins only.',
};

function t(key, ...args) {
  const value = messages[key];
  return typeof value === 'function' ? value(...args) : value;
}

module.exports = { t };
