const { Model } = require('objection');

class VoiceCallback extends Model {
    static get tableName() {
        return 'voice_callback';
    }


}

module.exports = VoiceCallback;