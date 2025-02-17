/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loginAndWaitForPage,
  loginWithUserAndWaitForPageWithoutDateRange,
} from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';
import { waitForAllHostsToBeLoaded } from '../../tasks/hosts/all_hosts';
import {
  clickOutOfSourcererTimeline,
  clickTimelineRadio,
  deselectSourcererOptions,
  isCustomRadio,
  isHostsStatValue,
  isNotCustomRadio,
  isNotSourcererSelection,
  isSourcererOptions,
  isSourcererSelection,
  openSourcerer,
  resetSourcerer,
  setSourcererOption,
  unsetSourcererOption,
} from '../../tasks/sourcerer';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { populateTimeline } from '../../tasks/timeline';
import { SERVER_SIDE_EVENT_COUNT } from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';
import { createUsersAndRoles, secReadCasesAll, secReadCasesAllUser } from '../../tasks/privileges';
import { TOASTER } from '../../screens/configure_cases';

const usersToCreate = [secReadCasesAllUser];
const rolesToCreate = [secReadCasesAll];
// Skipped at the moment as this has flake due to click handler issues. This has been raised with team members
// and the code is being re-worked and then these tests will be unskipped
describe('Sourcerer', () => {
  beforeEach(() => {
    cleanKibana();
  });
  describe('permissions', () => {
    before(() => {
      createUsersAndRoles(usersToCreate, rolesToCreate);
    });
    it(`role(s) ${secReadCasesAllUser.roles.join()} shows error when user does not have permissions`, () => {
      loginWithUserAndWaitForPageWithoutDateRange(HOSTS_URL, secReadCasesAllUser);
      cy.get(TOASTER).should('have.text', 'Write role required to generate data');
    });
  });
  // Originially written in December 2020, flakey from day1
  // has always been skipped with intentions to fix, see note at top of file
  describe.skip('Default scope', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      loginAndWaitForPage(HOSTS_URL);
    });

    it('has SIEM index patterns selected on initial load', () => {
      openSourcerer();
      isSourcererSelection(`auditbeat-*`);
    });

    it('has Kibana index patterns in the options', () => {
      openSourcerer();
      isSourcererOptions([`metrics-*`, `logs-*`]);
    });

    it('selected DATA_VIEW gets added to sourcerer', () => {
      setSourcererOption(`metrics-*`);
      openSourcerer();
      isSourcererSelection(`metrics-*`);
    });

    it('does not return data without correct pattern selected', () => {
      waitForAllHostsToBeLoaded();
      isHostsStatValue('4 ');
      setSourcererOption(`metrics-*`);
      unsetSourcererOption(`auditbeat-*`);
      isHostsStatValue('0 ');
    });

    it('reset button restores to original state', () => {
      setSourcererOption(`metrics-*`);
      openSourcerer();
      isSourcererSelection(`metrics-*`);
      resetSourcerer();
      openSourcerer();
      isNotSourcererSelection(`metrics-*`);
    });
  });
  // Originially written in December 2020, flakey from day1
  // has always been skipped with intentions to fix
  describe.skip('Timeline scope', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      loginAndWaitForPage(HOSTS_URL);
    });

    const alertPatterns = ['.siem-signals-default'];
    const rawPatterns = ['auditbeat-*'];
    const allPatterns = [...alertPatterns, ...rawPatterns];

    it('Radio buttons select correct sourcerer patterns', () => {
      openTimelineUsingToggle();
      openSourcerer('timeline');
      allPatterns.forEach((ss) => isSourcererSelection(ss, 'timeline'));
      clickTimelineRadio('raw');
      rawPatterns.forEach((ss) => isSourcererSelection(ss, 'timeline'));
      alertPatterns.forEach((ss) => isNotSourcererSelection(ss, 'timeline'));
      clickTimelineRadio('alert');
      alertPatterns.forEach((ss) => isSourcererSelection(ss, 'timeline'));
      rawPatterns.forEach((ss) => isNotSourcererSelection(ss, 'timeline'));
    });

    it('Adding an option results in the custom radio becoming active', () => {
      openTimelineUsingToggle();
      openSourcerer('timeline');
      isNotCustomRadio();
      clickOutOfSourcererTimeline();
      const luckyOption = 'logs-*';
      setSourcererOption(luckyOption, 'timeline');
      openSourcerer('timeline');
      isCustomRadio();
    });

    it('Selected index patterns are properly queried', () => {
      openTimelineUsingToggle();
      populateTimeline();
      openSourcerer('timeline');
      deselectSourcererOptions(rawPatterns, 'timeline');
      cy.get(SERVER_SIDE_EVENT_COUNT).should(($count) => expect(+$count.text()).to.eql(0));
    });
  });
});
