

import * as yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as convert from 'xml-js';
import ncp from 'ncp';



class App {

    settings: any;

    projectPath: string;
    app: string;
    projectPubspecPath: string;
    newPubspecPath: string;

    currentPackageName: string;
    newPackageName: string;

    async run() {

        if (!(await this.parseFlappSettings())) return;

        this.newPackageName = this.settings['apps'][this.app]['AppId'];
        this.currentPackageName = await this.getCurrentAndroidPackageName();

        console.log(`Current Package: ${this.currentPackageName}`);
        console.log(`New Package: ${this.newPackageName}`);


        try {
            await this.patchAndroidAppId();
            await this.patchAndroidGradle();
            await this.patchAndroidKotlin();

            await this.linkFiles();
            await this.copyFolders();


            // await this.linkPubspec();
            // await this.linkInfoPlist();
            // await this.linkGoogleServiceJson();
            // await this.linkGoogleServiceInfoPlist();
            // await this.linkKeyProperties();

        } catch (e) {
            this.error(e);
        }
    }


    error(msg: any) {
        console.log('============== Flapp Error ===============');
        console.log(msg);
        console.log('@see https://github.com/thruthesky/flutter-multi-apps')
    }
    async parseFlappSettings(): Promise<boolean> {

        if (!yargs.argv.app) {
            this.error('Input app');
            return false;
        } else {
            this.app = yargs.argv.app as string;
        }

        this.projectPath = yargs.argv.path as string;
        if (!this.projectPath) this.projectPath = '.';


        const flappPath: string = path.join(this.projectPath, 'flapp.json');


        if (!fs.existsSync(flappPath)) {
            this.error(`Flapp configuration file does not exists at ${flappPath}`);
            return false;
        }




        this.settings = JSON.parse(fs.readFileSync(flappPath).toString());



        this.projectPubspecPath = path.join(this.projectPath, 'pubspec.yaml');
        this.newPubspecPath = path.join(this.projectPath, `lib/apps/${yargs.argv.app}/res/${yargs.argv.app}.pubspec.yaml`);


        if (!fs.existsSync(this.projectPubspecPath)) {
            this.error('You are not in Flutter project folder');
            return false;
        }


        if (!fs.existsSync(this.newPubspecPath)) {
            this.error(`${this.app} does not exists.`);
            return false;
        }


        return true;

    }



    /**
     * Android 의 package name 을 가져온다.
     */
    async getCurrentAndroidPackageName() {
        const main: string = path.join(this.projectPath, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
        const mainXml = fs.readFileSync(main).toString();
        const mainXml2Json = convert.xml2json(mainXml, { compact: true, ignoreComment: true, spaces: 4 });
        const mainJson = JSON.parse(mainXml2Json);
        const currentPackage = mainJson['manifest']['_attributes']['package'];
        return currentPackage;
    }

    /**
     * Android 의 Gradle 변경한다.
     */
    async patchAndroidGradle() {
        const gradlePath: string = path.join(this.projectPath, 'android', 'app', 'build.gradle');
        const gradleContent = fs.readFileSync(gradlePath).toString();
        const temp = gradleContent.replace(this.currentPackageName, this.newPackageName);
        fs.writeFileSync(gradlePath, temp);

        console.log('Patch Android Gradle');
    }
    /**
     * Android 의 Kotlin 파일을 변경한다.
     */
    async patchAndroidKotlin() {
        const mainActivityPath: string = path.join(this.projectPath, this.settings['MainActivity']);

        const mainActivityPathContent = fs.readFileSync(mainActivityPath).toString();
        const temp = mainActivityPathContent.replace(this.currentPackageName, this.newPackageName);
        fs.writeFileSync(mainActivityPath, temp);

        console.log('Patch Android Kotalin Mainactivit');
    }

    /**
     * Android 의 AppManifest.xml 들의 package 를 변경한다.
     */
    async patchAndroidAppId() {

        const main: string = path.join(this.projectPath, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
        const debug: string = path.join(this.projectPath, 'android', 'app', 'src', 'debug', 'AndroidManifest.xml');
        const profile: string = path.join(this.projectPath, 'android', 'app', 'src', 'profile', 'AndroidManifest.xml');
        const mainXml = fs.readFileSync(main).toString();
        const debugXml = fs.readFileSync(debug).toString();
        const profileXml = fs.readFileSync(profile).toString();

        let temp = mainXml.replace(this.currentPackageName, this.newPackageName);
        fs.writeFileSync(main, temp);
        temp = debugXml.replace(this.currentPackageName, this.newPackageName);
        fs.writeFileSync(debug, temp);
        temp = profileXml.replace(this.currentPackageName, this.newPackageName);
        fs.writeFileSync(profile, temp);

        console.log('Patch Android App Id');
    }


    // async linkPubspec() {

    //     console.log('re-link pubspeck.yaml');
    //     const currentPubspec = fs.readFileSync(this.projectPubspecPath).toString();
    //     const currDoc = await yaml.safeLoad(currentPubspec);
    //     console.log('current app: ', currDoc['name'], currDoc['version']);

    //     const newPubspec = fs.readFileSync(this.newPubspecPath).toString();
    //     const newDoc = await yaml.safeLoad(newPubspec);
    //     console.log('new app: ', newDoc['name'], newDoc['version']);

    //     if (fs.existsSync(this.projectPubspecPath))
    //         fs.unlinkSync(this.projectPubspecPath);

    //     fs.linkSync(this.newPubspecPath, this.projectPubspecPath);

    //     console.log('success');
    // }
    // async linkInfoPlist() {
    //     console.log('re-link Info.plist');
    //     const src = path.join(this.projectPath, 'lib', 'apps', this.app, 'res', `${this.app}.Info.plist`);
    //     const dst = path.join(this.projectPath, 'ios', 'Runner', 'Info.plist');


    //     if (fs.existsSync(dst))
    //         fs.unlinkSync(dst);
    //     fs.linkSync(src, dst);
    //     console.log('success');
    // }


    // async linkGoogleServiceJson() {
    //     console.log('re-link google-services.json');
    //     const src = path.join(this.projectPath, 'lib', 'apps', this.app, 'res', `${this.app}.google-services.json`);
    //     const dst = path.join(this.projectPath, 'android', 'app', 'google-services.json');

    //     if (fs.existsSync(dst))
    //         fs.unlinkSync(dst);
    //     fs.linkSync(src, dst);
    //     console.log('success');
    // }

    // async linkGoogleServiceInfoPlist() {
    //     console.log('re-link GoogleService-Info.plist');
    //     const src = path.join(this.projectPath, 'lib', 'apps', this.app, 'res', `${this.app}.GoogleService-Info.plist`);
    //     const dst = path.join(this.projectPath, 'ios', 'Runner', 'GoogleService-Info.plist');

    //     if (fs.existsSync(dst))
    //         fs.unlinkSync(dst);
    //     fs.linkSync(src, dst);
    //     console.log('success');
    // }

    // async linkKeyProperties() {
    //     console.log('re-link key.properties');
    //     const src = path.join(this.projectPath, 'lib', 'apps', this.app, 'res', `${this.app}.key.properties`);
    //     const dst = path.join(this.projectPath, 'android', 'key.properties');

    //     if (fs.existsSync(dst))
    //         fs.unlinkSync(dst);
    //     fs.linkSync(src, dst);
    //     console.log('success');
    // }


    async linkFiles() {
        const app = this.settings['apps'][this.app];
        if (app['files'] !== void 0) {
            const files = app['files'];
            for (let f of Object.keys(files)) {
                // console.log(f, '=>', files[f]);
                const src: string = path.join(this.projectPath, f);
                // console.log(src);
                if (fs.existsSync(src)) { // 소스 파일이 존재하면
                    const dst = path.join(this.projectPath, files[f]);
                    // 목적 파일이 존재하면 삭제
                    if (fs.existsSync(dst)) {
                        fs.unlinkSync(dst);
                    }
                    // 링크를 건다
                    fs.linkSync(src, dst);
                    console.log(`Hard link: ${src} => ${dst}`);
                } else {
                    this.error(`Source: ${src} does not exist. abort!`);
                    break;
                }
            }
        }
    }


    async copyFolders() {






        const app = this.settings['apps'][this.app];
        if (app['folders'] !== void 0) {
            const files = app['folders'];
            for (let f of Object.keys(files)) {
                const src: string = path.join(this.projectPath, f);
                if (fs.existsSync(src)) {
                    const dst = path.join(this.projectPath, files[f]);
                    ncp(src, dst, { limit: 16 }, (err) => {
                        if (err) {
                            this.error(err);
                        } else {
                            console.log(`Folder copied: ${src} => ${dst}`);
                        }
                    });
                } else {
                    this.error(`Folder Copy: Source: ${src} does not exist. abort!`);
                    break;
                }

                // if (fs.existsSync(src)) { // 소스 파일이 존재하면
                //     const dst = path.join(this.projectPath, files[f]);
                //     // 목적 파일이 존재하면 삭제
                //     if (fs.existsSync(dst)) {
                //         fs.unlinkSync(dst);
                //     }
                //     // 링크를 건다
                //     fs.linkSync(src, dst);
                //     console.log(`Hard link: ${src} => ${dst}`);
                // } else {
                //     this.error(`Source: ${src} does not exist. abort!`);
                //     break;
                // }
            }

        }
    }

}

(new App()).run();


