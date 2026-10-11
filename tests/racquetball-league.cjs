'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRacquetballStore } = require('../lib/racquetball-store');
const { createLeague, scoreResult } = require('../lib/racquetball-league');
const { createLeagueMailer } = require('../lib/racquetball-mail');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'racquetball-league-'));
let clock = Date.parse('2026-10-10T12:00:00Z');
let store, league;
const one = 'one@example.com', two = 'two@example.com', three = 'three@example.com';
const event = (changes = {}) => ({ title: 'League match', kind: 'match', date: '2026-11-01', startTime: '18:00', endTime: '19:00', location: 'Court 1', notes: '', player1: one, player2: two, ...changes });
const mailToken = () => league.pendingMail().at(-1).text.match(/\/confirm#([a-f0-9]{64})/)[1];
async function run() {
  assert.deepEqual(scoreResult({ games: [[15, 10], [15, 10]] }).points, [5, 1]);
  assert.deepEqual(scoreResult({ games: [[15, 9], [15, 10]] }).points, [5, 0]);
  assert.deepEqual(scoreResult({ games: [[15, 10], [10, 15], [11, 9]] }).points, [4, 2]);
  assert.deepEqual(scoreResult({ games: [[13, 15], [16, 18]] }).points, [1, 5]);
  assert.deepEqual(scoreResult({ games: [[15, 13], [13, 15], [12, 14]] }).points, [2, 4]);
  assert.deepEqual(scoreResult({ forfeit: true, winner: 2 }).points, [0, 5]);
  for (const games of [
    [[15,14],[15,10]], [[16,10],[15,10]], [[15,10]], [[15,10],[15,10],[11,9]],
    [[15,10],[10,15]], [[15,10],[10,15],[11,10]], [[15.5,10],[15,10]]
  ]) assert.throws(() => scoreResult({ games }), undefined, JSON.stringify(games));
  store = createRacquetballStore({ dataDir: temp, now: () => clock, isAdmin: () => true });
  for (const [email, name] of [[one, 'Player One'], [two, 'Player Two'], [three, 'Player Three']]) {
    store.signUp({ email, fullName: name, phone: '5195550123', pin: '0042' });
  }
  store.receivePlayers(store.pendingPlayers());
  league = createLeague({ dataDir: temp, now: () => clock });
  const login = league.logIn({ email: one, pin: '0042' });
  assert.equal(league.session(login.token), one);
  for (let attempt = 0; attempt < 5; attempt++) assert.throws(() => league.logIn({ email: two, pin: '1111' }));
  assert.throws(() => league.logIn({ email: two, pin: '0042' }), /Too many/);
  clock += 60001;
  assert.equal(league.logIn({ email: two, pin: '0042' }).member.email, two);
  assert.throws(() => league.saveSchedule(event({ player2: one })), /different/);
  const id = league.saveSchedule(event()).event.id;
  assert.throws(() => league.saveSchedule(event({ player2: three, location: 'Court 2' })), /conflicts/);
  assert.throws(() => league.saveSchedule(event({ kind: 'practice', player1: '', player2: '', location: 'court 1' })), /conflicts/);
  assert.throws(() => league.submitScore(id, three, { games: [[15,10],[15,10]] }), /only manage/);
  league.submitScore(id, one, { games: [[15,10],[15,10]] });
  const token = mailToken();
  assert.equal(league.standings().standings.find(row => row.name === 'Player One').points, 0, 'pending score must not count');
  assert.equal(league.review(token).payload.points[0], 5);
  assert.equal(league.standings().standings[0].played, 0, 'reviewing a link must never approve it');
  const request = league.myMatches(two)[0].pending[0];
  assert.equal(request.canRespond, true);
  assert.throws(() => league.respond({ requestId: request.id, email: one, decision: 'approve' }), /invalid/);
  league.respond({ token, decision: 'approve' });
  assert.throws(() => league.respond({ token, decision: 'approve' }), /already used/);
  assert.equal(league.standings().standings[0].points, 5);
  assert.equal(league.standings().standings[0].differential, 10);
  assert.throws(() => league.submitScore(id, two, { forfeit: true, winner: 2 }), /administrator/);
  league.correctResult(id, { games: [[15,10],[10,15],[9,11]] });
  assert.equal(league.standings().standings[0].name, 'Player Two');
  assert.equal(league.standings().standings[0].points, 4);
  assert.equal(league.standings().standings.find(row => row.name === 'Player One').points, 2);
  league.correctResult(id, { clear: true });
  assert.equal(league.standings().standings[0].played, 0);
  league.submitScore(id, two, { games: [[15,10],[15,10]] });
  league.respond({ token: mailToken(), decision: 'decline' });
  assert.equal(league.myMatches(one)[0].status, 'disputed');
  assert.throws(() => league.submitScore(id, one, { forfeit: true, winner: 1 }), /administrator/);
  league.correctResult(id, { forfeit: true, winner: 2 });
  assert.equal(league.standings().standings[0].points, 5);
  assert.equal(league.standings().standings[0].differential, 0);
  league.correctResult(id, { clear: true });
  league.propose(id, one, { options: [
    { date: '2026-11-02', startTime: '18:00', endTime: '19:00' },
    { date: '2026-11-03', startTime: '19:00', endTime: '20:00' }
  ] });
  let rescheduleToken = mailToken();
  assert.equal(league.review(rescheduleToken).type, 'reschedule');
  league.respond({ token: rescheduleToken, decision: 'approve', option: 1 });
  assert.equal(league.schedule('2026-11')[0].date, '2026-11-03');
  league.propose(id, two, { options: [{ date: '2026-11-04', startTime: '18:00', endTime: '19:00' }] });
  league.respond({ token: mailToken(), decision: 'decline' });
  assert.equal(league.schedule('2026-11')[0].date, '2026-11-03');
  league.propose(id, one, { options: [{ date: '2026-11-05', startTime: '18:00', endTime: '19:00' }] });
  rescheduleToken = mailToken();
  league.saveSchedule(event({ player2: three, date: '2026-11-05' }));
  assert.throws(() => league.respond({ token: rescheduleToken, decision: 'approve', option: 0 }), /conflicts/);
  assert.equal(league.review(rescheduleToken).type, 'reschedule', 'failed conflicts must not consume the request');
  clock += 7 * 86400000 + 1;
  assert.throws(() => league.review(rescheduleToken), /expired/);
  assert.equal(league.session(login.token), null, 'player sessions must expire');
  league.deleteSchedule(id);
  assert.throws(() => league.review(rescheduleToken));
  const second = league.saveSchedule(event({ date: '2026-12-01' })).event.id;
  league.submitScore(second, one, { games: [[15,10],[15,10]] });
  const sent = [];
  let failed = true;
  const mailer = createLeagueMailer({
    league, from: 'test@example.com', logger: { error() {} },
    transporter: { sendMail: async message => { if (failed) throw new Error('offline'); sent.push(message); } }
  });
  await mailer.flush();
  assert.equal(league.pendingMail().length, 1);
  failed = false;
  await mailer.flush();
  assert.equal(sent.length, 1);
  assert(sent[0].html.includes('href="https://app.rdpsplace.me/racquetball/confirm#'));
  assert.equal(league.pendingMail().length, 0);
  league.close(); league = createLeague({ dataDir: temp, now: () => clock });
  assert.equal(league.myMatches(one).find(entry => entry.id === second).status, 'pending');
  assert.equal(league.pendingMail().length, 0, 'sent mail state must persist');
  const resetMember = store.pendingPlayers().find(member => member.email === one);
  const oldUpload = store.pendingPlayers();
  store.resetPin({ memberId: resetMember.id, pin: '1234' });
  store.completePlayerSync(oldUpload.map(member => member.id), oldUpload);
  assert(store.pendingPlayers().some(member => member.email === one), 'concurrent PIN reset must not be acknowledged by an older upload');
  const activeSession = league.logIn({ email: one, pin: '0042' });
  const newUpload = store.pendingPlayers();
  assert.equal(store.receivePlayers(newUpload).success, true);
  assert.equal(league.session(activeSession.token), null, 'PIN reset must revoke old online sessions');
  assert.equal(league.logIn({ email: one, pin: '1234' }).member.email, one);
  assert.equal(store.receivePlayers([{ ...newUpload[0], id: 'different-registration' }]).success, false, 'a different kiosk registration must not overwrite credentials');
  clock += 7 * 86400000 + 1;
  assert.equal(league.myMatches(one).find(entry => entry.id === second).status, 'scheduled', 'expired scores must restore match controls');
  assert.equal(league.propose(second, one, { options: [{ date: '2026-12-02', startTime: '18:00', endTime: '19:00' }] }).success, true);
  const publicData = JSON.stringify({ events: league.schedule('2026-12'), ...league.standings() });
  assert(!publicData.includes('@example.com') && !publicData.includes('pinHash'), 'public responses must not reveal contacts or credentials');
  console.log('PASS: exact points thresholds, win-by-two, assigned-player authorization, one-time opponent confirmation, disputes, corrections, reschedule choices/conflicts/expiry, email retries, sessions and persistence');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  league?.close(); store?.close(); fs.rmSync(temp, { recursive: true, force: true });
});
