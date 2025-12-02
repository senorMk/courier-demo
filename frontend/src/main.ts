import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from 'app/app.component';
import { appConfig } from 'app/app.config';

console.log('🚀 [BOOTSTRAP] Starting Angular application...');
console.time('⏱️ Application Bootstrap');

bootstrapApplication(AppComponent, appConfig)
    .then(() => {
        console.timeEnd('⏱️ Application Bootstrap');
        console.log('✅ [BOOTSTRAP] Application bootstrapped successfully');
    })
    .catch((err) => {
        console.timeEnd('⏱️ Application Bootstrap');
        console.error('❌ [BOOTSTRAP] Application bootstrap failed:', err);
    });
