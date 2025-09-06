const express = require('express');
const masterPeople = require('./masterPeople');
const masterGroups = require('./masterGroups');
const masterClans = require('./masterClans');
const masterOccupations = require('./masterOccupations');
const masterEducations = require('./masterEducations');

module.exports = function({ db, retryOnBusy }) {
  const router = express.Router();
  
  // Mount master data routes
  router.use('/people', masterPeople({ db, retryOnBusy }));
  router.use('/groups', masterGroups({ db, retryOnBusy }));
  router.use('/clans', masterClans({ db, retryOnBusy }));
  router.use('/occupations', masterOccupations({ db, retryOnBusy }));
  router.use('/educations', masterEducations({ db, retryOnBusy }));
  
  return router;
};
