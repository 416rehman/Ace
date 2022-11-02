const Command = require('../Command.js');
const {EmbedBuilder} = require('discord.js');
const fetch = require('node-fetch');
const {load, fail} = require('../../utils/emojis.json');

module.exports = class DogFactCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'dogfact',
            aliases: ['df'],
            usage: 'dogfact',
            description: 'Says a random dog fact.',
            type: client.types.FUN,
        });
    }

    async run(message,) {
        await message.channel
            .send({
                embeds: [new EmbedBuilder().setDescription(`${load} Loading...`)],
            }).then(msg => {
                message.loadingMessage = msg;
                this.handle(message, false);
            });
    }

    async interact(interaction) {
        await interaction.deferReply();
        await this.handle(interaction, true);
    }

    async handle(context, isInteraction) {
        try {
            const res = await fetch('https://dog-api.kinduff.com/api/facts');
            const fact = (await res.json()).facts[0];
            const embed = new EmbedBuilder()
                .setTitle('🐶  Dog Fact  🐶')
                .setDescription(fact)
                .setFooter({
                    text: this.getUserIdentifier(context.author),
                    iconURL: this.getAvatarURL(context.author),
                });

            if (isInteraction) {
                await context.editReply({
                    embeds: [embed],
                });
            }
            else {
                context.loadingMessage ? context.loadingMessage.edit({
                    embeds: [embed],
                }) : context.channel.send({
                    embeds: [embed],
                });
            }
        }
        catch (err) {
            const embed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription(fail + ' ' + err.message)
                .setColor('RED');
            if (isInteraction) {
                await context.editReply({
                    embeds: [embed],
                });
            }
            else {
                context.loadingMessage ? context.loadingMessage.edit({
                    embeds: [embed]
                }) : context.channel.send({
                    embeds: [embed]
                });
            }
        }
    }
};
