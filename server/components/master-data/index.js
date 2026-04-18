const express = require('express');
const masterPeople = require('./masterPeople');
const masterGroups = require('./masterGroups');
const masterClans = require('./masterClans');
const masterOccupations = require('./masterOccupations');
const masterEducations = require('./masterEducations');
const masterHalls = require('./masterHalls');
const masterHallEvents = require('./masterHallEvents');
const masterFoodItems = require('./masterFoodItems');
const masterProductNames = require('./masterProductNames');

module.exports = function({ db, retryOnBusy }) {
  const router = express.Router();
  
  // Mount master data routes
  router.use('/people', masterPeople({ db, retryOnBusy }));
  router.use('/groups', masterGroups({ db, retryOnBusy }));
  router.use('/clans', masterClans({ db, retryOnBusy }));
  router.use('/occupations', masterOccupations({ db, retryOnBusy }));
  router.use('/educations', masterEducations({ db, retryOnBusy }));
  router.use('/halls', masterHalls({ db, retryOnBusy }));
  router.use('/hall-events', masterHallEvents({ db, retryOnBusy }));
  router.use('/food-items', masterFoodItems({ db, retryOnBusy }));
  router.use('/product-names', masterProductNames({ db, retryOnBusy }));
  
  return router;
};
