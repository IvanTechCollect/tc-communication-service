const { Model } = require('objection');

class TimelineRule extends Model {
    static get tableName() {
        return 'timeline_rules';
    }


}

module.exports = TimelineRule;