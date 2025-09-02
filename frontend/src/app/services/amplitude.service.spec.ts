/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { AmplitudeService } from './amplitude.service';

describe('Service: Amplitude', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AmplitudeService]
    });
  });

  it('should ...', inject([AmplitudeService], (service: AmplitudeService) => {
    expect(service).toBeTruthy();
  }));
});
