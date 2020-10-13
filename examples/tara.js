module.exports = {
    relations: [
        `SELECT * FROM Account WHERE id IN ({{*Affiliation.accountId}})`,
        `SELECT * FROM Account WHERE id IN ({{*Bonus.accountId}})`,
        `SELECT * FROM Account WHERE id IN ({{*Malus.accountId}})`,
        `SELECT * FROM Account WHERE id IN ({{*Reservation.accountId}})`,
        `SELECT * FROM Account WHERE userId IN ({{*TotemUser.id}})`,

        `SELECT * FROM Address WHERE addressableType = 'Contact' AND addressableId IN ({{*Contact.id}})`,

        `SELECT * FROM Affiliation WHERE driverId IN ({{*Driver.id}})`,

        `SELECT * FROM Cart WHERE id IN ({{*CartRow.cartId}})`,
        `SELECT * FROM Cart WHERE id IN ({{*Payment.cartId}})`,

        `SELECT * FROM CartRow WHERE cartId IN ({{*Cart.id}})`,

        `SELECT * FROM Configuration WHERE type = 'user' AND entityId IN ({{*TotemUser.id}})`,
        `SELECT * FROM Configuration WHERE type = 'Operator' AND entityId IN ({{*Operator.id}})`,

        `SELECT * FROM Contact WHERE contactableType = "Driver" AND contactableId IN ({{*Driver.id}})`,
        `SELECT * FROM Contact WHERE id IN (
            SELECT addressableId FROM Address WHERE addressableType = 'Contact' AND id IN ({{*Address.id}})
        )`,

        `SELECT * FROM Driver WHERE id IN (
            SELECT contactableId FROM Contact WHERE contactableType = 'Driver' AND id IN ({{*Contact.id}})
        )`,
        `SELECT * FROM Driver WHERE id IN ({{*Bonus.driverId}})`,
        `SELECT * FROM Driver WHERE id IN ({{*Malus.driverId}})`,
        `SELECT * FROM Driver WHERE id IN ({{*Reservation.driverId}})`,
        `SELECT * FROM Driver WHERE userId IN ({{*TotemUser.id}})`,

        `SELECT * FROM EmbeddedDevice WHERE id IN ({{*Vehicle.embeddedDeviceId}})`,

        `SELECT * FROM File WHERE filableType = "Driver" AND filableId IN ({{*Driver.id}})`,
        `SELECT * FROM File WHERE filableType = "TotemUser" AND filableId IN ({{*TotemUser.id}})`,

        `SELECT * FROM Payment WHERE cartId IN ({{*Cart.id}})`,

        `SELECT * FROM Phone WHERE phoneableType = 'Contact' AND phoneableId IN ({{*Contact.id}})`,

        `SELECT * FROM Product WHERE id IN ({{*CartRow.productId}})`,

        `SELECT * FROM Reservation WHERE id IN ({{*Cart.reservationId}})`,

        `SELECT * FROM Role WHERE id IN ({{*RoleMapping.roleId}})`,

        `SELECT * FROM RoleMapping WHERE principalType = 'USER' AND principalId IN ({{*TotemUser.id}})`,

        `SELECT * FROM Sim WHERE id IN ({{*EmbeddedDevice.simId}})`,

        `SELECT * FROM Sponsor WHERE id IN ({{*Vehicle.sponsorId}})`,

        `SELECT * FROM TotemAcl WHERE userId IN ({{*TotemUser.id}})`,

        `SELECT * FROM TotemUser WHERE id IN ({{*Account.userId}})`,
        `SELECT * FROM TotemUser WHERE id IN ({{*Cart.userId}})`,
        `SELECT * FROM TotemUser WHERE id IN ({{*Driver.userId}})`,

        `SELECT * FROM Vehicle WHERE id IN ({{*Reservation.vehicleId}})`,
        `SELECT * FROM Vehicle WHERE id IN ({{*Event.entityId}})`,

        `SELECT * FROM Zone WHERE id IN ({{*Vehicle.zoneId}})`,
    ],

    queries: [
        `SELECT * FROM Configuration WHERE type = 'default' AND entityId IS NULL`,

        // References for firmware versions (used by Tobis)
        `SELECT * FROM EmbeddedDevice WHERE macAddress IN ('AAAAAAAAAAAA', 'BBBBBBBBBBBB')`,

        // DB migrations (!important)
        `SELECT * FROM Migration`,
        `SELECT * FROM Operator WHERE id IN (1, 5)`,
        `SELECT * FROM Product WHERE deletedAt IS NULL`,
        `SELECT * FROM ReportType WHERE isEditable = 0`,
        `SELECT * FROM Role`,

        // Values hard-coded in other services (like Tobis)
        `SELECT * FROM TotemUser WHERE username = 'tobis'`,
        `SELECT * FROM VehicleModel`,

        // Business queries

        `SELECT * FROM TotemUser WHERE email LIKE 'simon.robert%'`,

        `SELECT * FROM Vehicle`,
        `SELECT * FROM BiQuery`,

        `SELECT * FROM Bonus ORDER BY id DESC LIMIT 30`,

        `SELECT * FROM Account WHERE name = 'CEA Grenoble'`,
        `SELECT * FROM Coupon WHERE code = 'CEAGRENOBLE'`,

        `SELECT * FROM Vehicle`,
        `SELECT * FROM Station`,
        `SELECT * FROM Zone`,
        `SELECT * FROM Operator`,

        `SELECT * FROM Event WHERE type = 'vehicle.data_frame' ORDER BY id ASC LIMIT 500`,
    ],

    patches: [
        {
            table: 'TotemUser',
            patch: row => Object.assign(row, {
                ...(row.username !== 'tobis' && {
                    salt: '$2a$10$w6gN54T.gj3RoKKhhbkx/O',
                    password: 'dSjd9ZMsBDsieACh+D5gWN6Ei0bjCPNvEYonubOdEOA=',
                    ...((!row.email.match(/totem/)) && {
                        email: `${row.id}@example.com`,
                    }),
                }),
            }),
        },

        {
            // Suppression infos Stripe
            table: 'Account',
            patch: row => Object.assign(row, {
                customerId: null,
                cardId: null,
                name: row.name.replace(/^compte prépayé .+$/, `compte prépayé ${row.id}`),
            }),
        },

        {table: 'Phone', patch: row => Object.assign(row, {number: '0102030405'})},
        {table: 'Address', patch: row => Object.assign(row, {street: `9 impasse des gymnastes`})},
        {table: 'Contact', patch: row => Object.assign(row, {lastName: row.lastName.substr(0, 1)})},
    ],

    postDumpQueries: [
        // Test user
        `INSERT INTO TotemUser (salt, realm, username, password, credentials, challenges, email, emailVerified, verificationToken, status, created, lastUpdated, tribeId, comment, selfieUrl, createdAt, updatedAt, referrerId) VALUES ('$2a$10$w6gN54T.gj3RoKKhhbkx/O', NULL, 'test', 'dSjd9ZMsBDsieACh+D5gWN6Ei0bjCPNvEYonubOdEOA=', NULL, NULL, 'test@example.com', 1, NULL, 'active', NULL, NULL, NULL, '', '', '2018-01-25 22:17:29.000', '2018-07-24 09:47:24.000', NULL)`,
        `INSERT INTO RoleMapping (principalType, principalId, roleId) VALUES ('USER', LAST_INSERT_ID(), 1)`, // This is required for loopback endpoints
        `INSERT INTO TotemAcl(type, userId) SELECT 'bi_query' AS type, (SELECT id FROM TotemUser WHERE email = 'test@example.com') AS userId`,
        `INSERT INTO TotemAcl(type, userId) SELECT 'roles.admin' AS type, (SELECT id FROM TotemUser WHERE email = 'test@example.com') AS userId`,
    ],
};
