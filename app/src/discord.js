import Discord from 'discord.js';
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages] });

const token = process.env.BOT_TOKEN;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('Membantu pengguna!', { type: 'PLAYING' });
});


client.on('messageCreate', msg => {
  if (msg.author.bot) return;

  const prefix = '!';

  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'halo') {
    msg.reply('Halo juga!');
  }

  else if (command === 'tambah') {
    const num1 = parseFloat(args[0]);
    const num2 = parseFloat(args[1]);
    if (isNaN(num1) || isNaN(num2)) {
      msg.reply('Masukkan angka yang valid!');
    } else {
      msg.reply(`Hasilnya adalah: ${num1 + num2}`);
    }
  }

});

client.login(token);