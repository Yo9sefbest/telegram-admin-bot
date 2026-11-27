
const messages = {
  en: {
    welcome: (name) => `Hi ${name}! 👋\nI'm a demo bot built with Node.js.\n\nUse /help to see what I can do.`,
    help: 'Commands:\n/start - say hello\n/help - show this message\n/feedback <text> - send feedback to the team',
    feedbackUsage: 'Please add your message, for example:\n/feedback I love this bot',
    feedbackTooLong: 'That message is too long. Please keep it under 1000 characters.',
    feedbackThanks: 'Thanks! Your feedback was sent to the team. ✅',
    banned: 'You are not allowed to use this bot.',
    notAdmin: 'This command is for admins only.',
  },
  ar: {
    welcome: (name) => `أهلاً ${name}! 👋\nأنا بوت تجريبي مبني بـ Node.js.\n\nاكتب /help لمعرفة ما أستطيع فعله.`,
    help: 'الأوامر:\n/start - ترحيب\n/help - عرض هذه الرسالة\n/feedback <نص> - أرسل رأيك للفريق',
    feedbackUsage: 'من فضلك اكتب رسالتك بعد الأمر، مثال:\n/feedback البوت رائع',
    feedbackTooLong: 'الرسالة طويلة جداً. من فضلك اجعلها أقل من 1000 حرف.',
    feedbackThanks: 'شكراً لك! تم إرسال رأيك للفريق. ✅',
    banned: 'غير مسموح لك باستخدام هذا البوت.',
    notAdmin: 'هذا الأمر للمشرفين فقط.',
  },
};

function t(lang, key, ...args) {
  const value = (messages[lang] ?? messages.en)[key] ?? messages.en[key];
  return typeof value === 'function' ? value(...args) : value;
}

module.exports = { t };
