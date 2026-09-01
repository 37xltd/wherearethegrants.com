import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from './worker.mjs';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('the static fallback remains fail-closed if R2 is unavailable', () => {
  assert.match(html, /Check source coverage/);
  assert.match(html, /Projection not yet searchable/);
  assert.doesNotMatch(html, />Search Atlas/);
});

test('saved-search feedback is backed by local browser storage', () => {
  assert.match(html, /localStorage\.setItem\(savedKey/);
  assert.match(html, /wherearethegrants\.saved-searches/);
  assert.match(html, /Saved searches \(/);
});

const projection = {
  publicationStatus: 'approved',
  publicProjection: true,
  recordCount: 2,
  sourceSnapshotDate: '2026-08-27',
  archivedRecordsExcluded: 10,
  sourceSnapshot: 'Grants.gov test extract',
  sourceUrl: 'https://www.grants.gov/search-grants',
  licenceEvidenceUrl: 'https://www.usa.gov/government-copyright',
  rightsNote: 'Factual federal opportunity fields only.',
  personalDataPolicy: 'Contacts and free text excluded.',
  records: [
    { OpportunityID: '1', OpportunityTitle: 'Clean energy test grant', OpportunityNumber: 'TEST-1', AgencyCode: 'DOE', AgencyName: 'Department of Energy', CategoryOfFundingActivity: 'EN', CloseDate: '2026-12-31', AwardFloor: '1000', AwardCeiling: '5000' },
    { OpportunityID: '2', OpportunityTitle: 'Grid resilience test grant', OpportunityNumber: 'TEST-2', AgencyCode: 'DOE', AgencyName: 'Department of Energy', CategoryOfFundingActivity: 'EN', CloseDate: '2027-01-31', AwardFloor: '2000', AwardCeiling: '6000' },
  ],
};
const env = { PUBLIC_DATA: { get: async () => ({ json: async () => projection }) }, ASSETS: { fetch: async () => new Response(html) } };

test('approved R2 projection creates useful grant, agency and sitemap pages', async () => {
  const home = await worker.fetch(new Request('https://wherearethegrants.com/'), env);
  assert.match(await home.text(), /2 current Grants\.gov opportunities/);
  const grant = await worker.fetch(new Request('https://wherearethegrants.com/grant/1'), env);
  const grantHtml = await grant.text();
  assert.match(grantHtml, /Clean energy test grant/);
  assert.match(grantHtml, /Open official record/);
  assert.match(grantHtml, /Descriptions, contacts and attachments are excluded/);
  assert.match(grantHtml, /Related opportunities from this agency or category/);
  assert.match(grantHtml, /Grid resilience test grant/);
  assert.match(grantHtml, /not recommendations or eligibility matches/);
  const agency = await worker.fetch(new Request('https://wherearethegrants.com/agency/DOE'), env);
  assert.match(await agency.text(), /Department of Energy/);
  const sitemap = await worker.fetch(new Request('https://wherearethegrants.com/sitemap.xml'), env);
  const xml = await sitemap.text();
  assert.match(xml, /\/grant\/1/);
  assert.match(xml, /\/agency\/DOE/);
  assert.match(xml, /\/category\/EN/);
});

test('free-text result permutations remain noindex', async () => {
  const result = await worker.fetch(new Request('https://wherearethegrants.com/opportunities?q=energy'), env);
  assert.equal(result.headers.get('x-robots-tag'), 'noindex');
  assert.match(await result.text(), /Results for “energy”/);
});
