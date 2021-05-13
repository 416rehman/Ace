const { MessageEmbed } = require('discord.js');
const { reply } = require('./slashLibrary')
module.exports = {
    createSlashConfess: function createSlashConfess(client, server) {

        client.api.applications(client.user.id).guilds(server.id).commands.post({
            data: {
                name: "confess",
                description: "Post an anonymous confession",
                options: [
                    {
                        "name": "confession",
                        "description": "Type your confession",
                        "type": 3,
                        "required": true,
                    }
                ]
            }
        })
    },

    confess: function confess(interaction, client) {
        const prefix = (client.db.settings.selectPrefix.pluck().get(interaction.guild_id))
        const confessionsChannelID = (client.db.settings.selectConfessionsChannelId.pluck().get(interaction.guild_id))
        const confession = interaction.data.options[0].value;
        const guild = client.guilds.cache.get(interaction.guild_id)
        if (!confessionsChannelID) {
            reply(interaction, `This server doesn't have a confessions channel. Create one by using \`${prefix}setconfessions #channel\``, client)
        }
        else
        {

            const confessionsChannel = client.channels.cache.get(confessionsChannelID)
            const viewConfessionRole = client.db.settings.selectViewConfessionsRole.pluck().get(interaction.guild_id)
            var d = new Date();
            var n = d.valueOf();
            n = (n.toString())
            n = n.slice(n.length - 6)
            const alternate = client.utils.weightedRandom({0: 50, 1: 50})
            const ftr = alternate == 0 ? `Report ToS-breaking or hateful confessions by using /report [confessionID]` : `Type "/confess" in any channel to post a confession here.`
            const embed = new MessageEmbed()
                .setTitle(`Confession ID: ${n}`)
                .setDescription(`"${confession}"`)
                .setFooter(`${ftr} ${viewConfessionRole > 0 ? "| Viewable by staff" : ""}`)
                .setTimestamp()
                .setColor("RANDOM");
            confessionsChannel.send(embed).then(msg => {
                client.db.confessions.insertRow.run(
                    n,
                    confession,
                    interaction.member.user.id,
                    interaction.guild_id,
                    d.toISOString()
                );

                const user = guild.members.cache.find(u => u.id === interaction.member.user.id)
                reply(interaction, `Your confession has been posted!\nhttps://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id}`, client)
            })
        }
    }
}