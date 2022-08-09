const Command = require('../Command.js');
const {MessageEmbed} = require('discord.js');
const {success} = require('../../utils/emojis.json');
const {oneLine} = require('common-tags');

module.exports = class SetAutoRoleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'setautorole',
            aliases: ['setaur', 'saur'],
            usage: 'setautorole <role mention/ID>',
            description: oneLine`
        Sets the role all new members will receive upon joining your server.
        \nUse \`clearautorole\` to clear the current \`auto role\`.
      `,
            type: client.types.ADMIN,
            userPermissions: ['MANAGE_GUILD'],
            examples: ['setautorole @Member', 'clearautorole'],
        });
    }

    run(message, args) {
        this.handle(args.join(' '), message, false);
    }

    async interact(interaction) {
        await interaction.deferReply();
        const role = interaction.options.getRole('role');
        this.handle(role, interaction, true);
    }

    async handle(role, context, isInteraction) {
        const autoRoleId = this.client.db.settings.selectAutoRoleId
            .pluck()
            .get(context.guild.id);
        const oldAutoRole =
            context.guild.roles.cache.find((r) => r.id === autoRoleId) || '`None`';

        const embed = new MessageEmbed()
            .setTitle('Settings: `System`')
            .setThumbnail(context.guild.iconURL({dynamic: true}))
            .setFooter({
                text: this.getUserIdentifier(context.author),
                iconURL: this.getAvatarURL(context.author),
            })
            .setTimestamp()
            .setColor(context.guild.me.displayHexColor);

        // Clear if no args provided
        if (!role) {
            const payload = ({
                embeds: [
                    embed
                        .addField('Current Auto Role', `${oldAutoRole}` || '`None`')
                        .setDescription(this.description),
                ],
            });


            if (isInteraction) context.editReply(payload);
            else context.loadingMessage ? context.loadingMessage.edit(payload) : context.reply(payload);
        }

        // Update role
        role = isInteraction ? role : await this.getGuildRole(context.guild, role);

        this.client.db.settings.updateAutoRoleId.run(
            role.id,
            context.guild.id
        );

        const payload = ({
            embeds: [embed.addField('Auto Role', `${oldAutoRole} ➔ ${role}`)
                .setDescription(`The \`auto role\` was successfully updated. ${success}\nUse \`clearautorole\` to clear the current \`auto role\`.`)],
        });

        if (isInteraction) context.editReply(payload);
        else context.loadingMessage ? context.loadingMessage.edit(payload) : context.reply(payload);
    }
};
