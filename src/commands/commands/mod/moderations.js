const Command = require('../../Command.js');
const { MessageEmbed } = require('discord.js');
const { ReactionMenu } = require('../../ReactionMenu.js');
const emojis = require('../../../utils/emojis.json');
const {MessageActionRow} = require("discord.js");
const {MessageButton} = require("discord.js");
const {inPlaceSort} = require("fast-sort");

module.exports = class modActivityCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'modactivity',
      aliases: ['moderations'],
      usage: 'modactivity <user>/<role> <days>',
      description: 'Counts the number of moderation actions performed by a specified user or role and with an optional day filter. For example, `modactivity @split 7` will display the mod activity of the user named split over the last 7 days.',
      type: client.types.INFO,
      examples: ['modactivity 1', 'modactivity @CoolRole', 'modactivity @split 7'],
      userPermissions: ['VIEW_AUDIT_LOG']
    });
  }
  async run(message, args) {
    const embed = new MessageEmbed()
        .setDescription(`${emojis.load} Fetching Mod Activity...`)
        .setColor("RANDOM")

    message.channel.send({embeds: [embed]}).then(async msg=>
        {
          const activityButton = new MessageButton().setCustomId(`activity`).setLabel(`Activity Leaderboard`).setStyle('SECONDARY')
          activityButton.setEmoji(emojis.info.match(/(?<=\:)(.*?)(?=\>)/)[1].split(':')[1])
          const pointsButton = new MessageButton().setCustomId('points').setLabel(`Points Leaderboard`).setStyle('SECONDARY')
          pointsButton.setEmoji(emojis.point.match(/(?<=\:)(.*?)(?=\>)/)[1].split(':')[1])

          const row = new MessageActionRow();
          row.addComponents(activityButton)
          row.addComponents(pointsButton)

          if (!args[0]) await this.sendMultipleMessageCount(args, message.guild.members.cache, message, msg, embed, `Server Mod Activity`, 1000, row);
          else if (args[0])
          {
            const target = await this.getMemberFromMention(message, args[0]) || await message.guild.members.cache.get(args[0]);
            let days = parseInt(args[1]) || 1000

            if (target) {
              this.sendUserMessageCount(message, target, embed, msg, days);
            }
            else if (!args[1]) {
              days = parseInt(args[0]) || 1000
              await this.sendMultipleMessageCount(args, message.guild.members.cache, message, msg, embed, `Server ${days < 1000 && days > 0 ? days + ' Day ' : ''}Mod Activity`, days, row);
            }
          }
        }
    )
  }

  async sendMultipleMessageCount(args, collection, message, msg, embed, title, days = 1000, row) {
    if (days > 1000 || days < 0) days = 1000
    let data = message.client.db.activities.getGuildModerations.all(message.guild.id, days)

    let max;
    if (!max || max < 0) max = 10;
    else if (max > 25) max = 25;

    const lb = data.flatMap(d => {
      const member = message.guild.members.cache.get(d.user_id)
      if (!member) return []
      return {user: member, count: d.moderations || 0}
    });

    let i = 1
    const descriptions = lb.map(e => {
      const desc = `**${i}.** ${e.user}: **\`${e.count || 0}\`**`
      i++;
      return desc;
    })

    if (descriptions.length <= max) {
      const range = (descriptions.length == 1) ? '[1]' : `[1 - ${descriptions.length}]`;
      await msg.edit({embeds: [embed
          .setTitle(`${title} ${range}`)
          .setDescription(descriptions.join('\n'))
      ]});
    } else {
      const position = lb.findIndex(p => p.user.id === message.author.id)
      embed
          .setTitle(title)
          .setFooter(
              'Expires after two minutes.\n' + `${message.member.displayName}'s position: ${position + 1}`,
              message.author.displayAvatarURL({dynamic: true})
          );
      msg.delete()
      new ReactionMenu(message.client, message.channel, message.member, embed, descriptions, max, null, null, 120000, [row], m=>{
        const filter = (button) => button.user.id === message.author.id;
        const collector = m.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 120000, dispose: true });
        collector.on('collect', b => {
          if (b.customId === 'activity') {
            message.client.commands.get('activity').run(message, [])
            m.delete()
          } else if (b.customId === 'points') {
            message.client.commands.get('leaderboard').run(message, [])
            m.delete()
          }
        })
      });
    }
  }

  sendUserMessageCount(message, target, embed, msg, days, row) {
    if (days > 1000 || days < 0) days = 1000
    const messages =  message.client.db.activities.getModerations.pluck().get(target.id, message.guild.id, days);

    embed.setTitle(`${target.displayName}'s ${days < 1000 && days > 0 ? days + ' Day ' : ''}Activity`)
    embed.setDescription(`${target} has performed **${messages || 0} moderations** ${days === 1000 ? 'so far!' : 'in the last ' + days + ' days!'}`)

    msg.edit({embeds: [embed], components: [row]}).then(msg=>{
      const filter = (button) => button.user.id === message.author.id;
      const collector = msg.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 120000, dispose: true });

      collector.on('collect', b => {
        if (b.customId === 'activity') {
          message.client.commands.get('activity').run(message, ['all'])
          msg.delete()
        } else if (b.customId === 'points') {
          message.client.commands.get('leaderboard').run(message, [])
          msg.delete()
        }
      })
    })
  }
};