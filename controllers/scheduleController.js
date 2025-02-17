const ScheduledStep = require('../models/ScheduledStep');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');
const moment = require('moment');

const scheduleNextStep = async (unitId) => {
    console.log(`Scheduling next step for unit: ${unitId}`);

    // Find the next step that needs to be scheduled
    const stepToSchedule = await ProactiveRoadmap.query()
        .where('unit_id', unitId)
        .where('status', 0) // Pending status
        .where('communication_status', 1) // Valid for scheduling
        .where('is_scheduled', 0) // Not yet scheduled
        .first();

    if (!stepToSchedule) {
        console.log(`No pending step found for unit ${unitId}.`);
        return;
    }

    // Find the last completed/scheduled step
    const ranStep = await ProactiveRoadmap.query()
        .where('unit_id', unitId)
        .where('status', '!=', 0) // Any completed or in-progress step
        .where('communication_status', 1)
        .where('is_scheduled', 1)
        .first();

    // Default days to 1 if there's no previous step
    let days = stepToSchedule.days;
    if (!ranStep) {
        days = 1;
    } else {
        days = Math.max(1, stepToSchedule.days - ranStep.days); // Prevent negative values
    }

    // Clear any previous scheduled step before scheduling a new one
    await ScheduledStep.query().where('unit_id', unitId).delete();

    // Update all steps for this unit to ensure no step is mistakenly left as scheduled
    await ProactiveRoadmap.query()
        .where('unit_id', unitId)
        .where('is_scheduled', 1)
        .update({ is_scheduled: 0 });

    // Schedule the next step
    await ScheduledStep.query().insert({
        unit_id: unitId,
        proactive_id: stepToSchedule.id,
        completed: 0,
        scheduled_at: moment().add({ days }).toDate(),
        created_at: new Date(),
    });

    // Mark this step as scheduled
    await ProactiveRoadmap.query().where('id', stepToSchedule.id).update({ is_scheduled: 1 });

    console.log(`Scheduled step ${stepToSchedule.id} for unit ${unitId} in ${days} days.`);
};

module.exports = { scheduleNextStep };