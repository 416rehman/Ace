const Command = require('../Command.js');
const {MessageEmbed, MessageAttachment} = require('discord.js');
const {load} = require('../../utils/emojis.json');

module.exports = class tobecontinuedCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'tobecontinued',
            aliases: ['tobe', 'tbc'],
            usage: 'tobecontinued <user mention/id>',
            description: 'Generates a tobecontinued image',
            type: client.types.FUN,
            examples: ['tobecontinued @split'],
        });
    }

    async run(message, args) {
        const member = (await this.getGuildMember(message.guild, args.join(' '))) || message.author;
        await message.channel
            .send({
                embeds: [new MessageEmbed().setDescription(`${load} Loading...`)],
            }).then(msg => {
                message.loadingMessage = msg;
                this.handle(member, message, false);
            });
    }

    async interact(interaction) {
        await interaction.deferReply();
        const member = interaction.options.getUser('user') || interaction.author;
        this.handle(member, interaction, true);
    }

    async handle(targetUser, context, isInteraction) {
        const buffer = await context.client.ameApi.generate('tobecontinued', {
            url: this.getAvatarURL(targetUser, 'png'),
        });
        const attachment = new MessageAttachment(buffer, 'tobecontinued.png');

        if (isInteraction) {
            context.editReply({
                files: [attachment],
            });
        }
        else {
            context.loadingMessage ? context.loadingMessage.edit({
                files: [attachment],
                embeds: []
            }) : context.channel.send({
                files: [attachment],
            });
        }
    }
};
