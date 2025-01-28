const { Model } = require('objection');

class CommunicationHandling extends Model {
    static get tableName() {
        return 'communication_handling';
    }


}

module.exports = CommunicationHandling;
