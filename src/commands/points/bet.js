const Command = require('../Command.js');
const { MessageEmbed } = require('discord.js');
const { stripIndent } = require('common-tags');
const { confirm } = require("djs-reaction-collector")
const emojis = require('../../utils/emojis.json')

const limit = 1000;

module.exports = class betCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'bet',
      usage: 'bet <user mention/id/name> <point count>',
      description: 'Bet against someone. Winner receives double the bet amount',
      type: client.types.POINTS,
      examples: ['bet @split 1000']
    });
  }

  run(message, args) {
    if (message.guild.betsInProgress.has(message.author.id)) return message.reply(`${emojis.fail} You are already betting against someone! Please try again later.`).then(m=>{
      setTimeout(() => m.delete(), 5000);
    })

    const member = this.getMemberFromMention(message, args[0]) || message.guild.members.cache.get(args[0]);
    if (!member) return this.sendErrorMessage(message, 0, `Please mention a user or provide a valid user ID`);
    if (member.id === message.client.user.id)
      return message.channel.send(`${emojis.fail} Sorry I am not allowed to play with you 😟`).then(m=>{
        setTimeout(() => m.delete(), 5000);
      });
    if (member.user.id == message.author.id)
      return message.reply(`${emojis.fail} No stupid, you NEVER bet against yourself!!`).then(m=>{
        setTimeout(() => m.delete(), 5000);
      })

    if (message.guild.betsInProgress.has(member.user.id)) return message.reply(`${emojis.fail} ${member.user.username} is already betting against someone! Please try again later.`).then(m=>{
      setTimeout(() => m.delete(), 5000);
    })

    let amount = parseInt(args[1]);
    if (isNaN(amount) === true || !amount)
      return this.sendErrorMessage(message, 0, `Please provide a valid point count`);

    const points = message.client.db.users.selectPoints.pluck().get(message.author.id, message.guild.id);
    const otherPoints = message.client.db.users.selectPoints.pluck().get(member.user.id, message.guild.id);

    if (amount < 0 || amount > points) return message.reply(`${emojis.nep} Please provide an amount you currently have! You have ${points} points ${emojis.point}`).then(m=>m.delete(5000));
    if (amount > limit) amount = limit;
    if (amount < 0 || amount > otherPoints) return message.reply(`${emojis.nep} ${member.user.username} only has ${otherPoints} points ${emojis.point}! Please change your betting amount!`).then(m=>{
      setTimeout(() => m.delete(), 5000);
    });

    message.guild.betsInProgress.set(message.author.id, new Date().getTime().toString());
    message.guild.betsInProgress.set(member.user.id, new Date().getTime().toString());

    try {
      message.channel.send(`${member}, ${message.author.username} has sent you a bet of ${amount} points ${emojis.point}. Do you accept?`).then(async msg => {
        const reactions = await confirm(msg, member, ["✅", "❎"], 30000);
        if (reactions === '✅') {
          const embed = new MessageEmbed()
              .setTitle(`${message.author.username} VS ${member.user.username}`)
              .setDescription(`${emojis.point} **Rolling for ${amount} points** ${emojis.point}\n${emojis.dices}${emojis.dices}${emojis.dices}`)
              .setFooter(`${message.author.username} points: ${points} | ${member.user.username} points: ${otherPoints}`)
          message.channel.send({embeds: [embed]}).then(msg2 => {
            msg.delete()
            setTimeout(() => {
                      const d = message.client.utils.weightedRandom({0: 50, 1: 50})

                      let winner = message.author
                      if (d == 1) winner = member.user

                      const winnerPoints = winner.id === member.id ? otherPoints : points;

                      const loser = winner.id === member.id ? message.author : member.user;
                      const loserPoints = winner.id === member.id ? points : otherPoints;

                      message.client.db.users.updatePoints.run({points: -amount}, loser.id, message.guild.id);
                      message.client.db.users.updatePoints.run({points: amount}, winner.id, message.guild.id);

                      const embed = new MessageEmbed()
                          .setTitle(`${message.author.username} VS ${member.user.username}`)
                          .setDescription(`🎉 ${winner} has won ${amount} points ${emojis.point} from ${loser}!`)
                          .setFooter(`🏆 ${winner.username}'s points: ${winnerPoints + amount} | ${loser.username}'s points: ${loserPoints - amount}`)
                      msg2.edit({embeds: [embed]})
            }, 3000)
          }).catch(e => {
            console.log(e)
          })
        } else {
          msg.edit(`${emojis.fail} ${message.author}, ${member.user.username} has rejected your bet!`).then(msg=>{
            setTimeout(() => m.delete(), 5000);
          })
        }
      })
    } catch (e) {
      console.log(e)
    }
    message.guild.betsInProgress.delete(message.author.id)
    message.guild.betsInProgress.delete(member.user.id)
  };
}
