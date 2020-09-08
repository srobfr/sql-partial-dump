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

        `SELECT * FROM Zone WHERE id IN ({{*Vehicle.zoneId}})`,

    ],
    queries: [
        // `SELECT * FROM Address ORDER BY id DESC LIMIT 10`,
        // `SELECT * FROM Reservation ORDER BY id DESC LIMIT 1`,
        `SELECT * FROM CartRow ORDER BY id DESC LIMIT 1`,
    ],
};
