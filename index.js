"use strict";
let Service, Characteristic, ContactState;

const axios = require('axios');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    ContactState = homebridge.hap.Characteristic.ContactSensorState;
    homebridge.registerAccessory("homebridge-jewish-calendar-ical", "JewishCalendar_iCal", JewishCalendar);
};

class JewishCalendar {
    constructor(log, config, api) {
        this.log = log;

        // this.today = new Date();
        this.today = new Date("2024-10-02T18:57:00-04:00");
        this.lat = parseFloat(config.latitude);
        this.long = parseFloat(config.longitude);
        this.name = config.name;

        this.il = config.israel;
        this.sheminiatzeret_in_sukkot = config.sheminiatzeret_in_sukkot;
        this.candlelighting = config.candlelighting;
        this.havdalah = config.havdalah;
        this.sefiratOmerCustom = config.sefiratOmerCustom;
        this.threeWeeksCustom = config.threeWeeksCustom;

        this.services = {};
        this.services.Shabbat = new Service.ContactSensor(config.Shabbat, "Shabbat");
        this.services.YomTov = new Service.ContactSensor(config.YomTov, "YomTov");
        this.services.Kodesh = new Service.ContactSensor(config.Kodesh, "Kodesh");
        this.services.RoshHashana = new Service.ContactSensor(config.RoshHashana, "RoshHashana");
        this.services.YomKippur = new Service.ContactSensor(config.YomKippur, "YomKippur");
        this.services.Sukkot = new Service.ContactSensor(config.Sukkot, "Sukkot");
        this.services.SheminiAtzeret = new Service.ContactSensor(config.SheminiAtzeret, "SheminiAtzeret");
        this.services.Pesach = new Service.ContactSensor(config.Pesach, "Pesach");
        this.services.Shavuot = new Service.ContactSensor(config.Shavuot, "Shavuot");
        this.services.Chanukah = new Service.ContactSensor(config.Chanukah, "Chanukah");
        this.services.ThreeWeeks = new Service.ContactSensor(config.ThreeWeeks, "ThreeWeeks");
        this.services.Omer = new Service.ContactSensor(config.Omer, "Omer");
        this.services.SefiratOmer = new Service.ContactSensor(config.SefiratOmer, "SefiratOmer");
        this.services.Mourning = new Service.ContactSensor(config.Mourning, "Mourning");

        this.updateJewishDay();
        setTimeout(this.updateLoop.bind(this), 30000);
    }

    updateSensors() {
        this.services.Shabbat.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isShabbat());
        this.services.YomTov.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isYomTov());
        this.services.Kodesh.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isKodesh());
        this.services.RoshHashana.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isRoshHashana());
        this.services.YomKippur.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isYomKippur());
        this.services.Sukkot.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isSukkot());
        this.services.SheminiAtzeret.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isSheminiAtzeret());
        this.services.Pesach.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isPesach());
        this.services.Shavuot.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isShavuot());
        this.services.Chanukah.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isChanukah());
        this.services.ThreeWeeks.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isThreeWeeks());
        this.services.Omer.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isOmer());
        this.services.Mourning.getCharacteristic(Characteristic.ContactSensorState).setValue(this.isMourning());
    }

    getName(obj, callback) {
        callback(null, obj.name);
    }

    getServices() {

        var informationService = new Service.AccessoryInformation();


        informationService
            .setCharacteristic(Characteristic.Name, this.name)
            .setCharacteristic(Characteristic.Manufacturer, "Daniel Smith")
            .setCharacteristic(Characteristic.Model, "Standard Jewish Calendar (Hebcal)")
            .setCharacteristic(Characteristic.SerialNumber, "613")
            .setCharacteristic(Characteristic.FirmwareRevision, 613);

        var services = [
            informationService,
            this.services.Shabbat,
            this.services.YomTov,
            this.services.Kodesh,
            this.services.RoshHashana,
            this.services.YomKippur,
            this.services.Sukkot,
            this.services.SheminiAtzeret,
            this.services.Pesach,
            this.services.Shavuot,
            this.services.Chanukah,
            this.services.ThreeWeeks,
            this.services.Omer,
            this.services.Mourning
        ];
        return services;
    }

    makeUrl(year = 0) {
        var ashkenaz = "on";
        year = (year === 0) ? "now" : year.toString();
        var url = "https://www.hebcal.com/hebcal?v=1&cfg=json&a=" +
            ashkenaz + "&maj=on&min=on&mod=on&nx=on&year=" + year + "&month=x&ss=on&mf=on&c=on&o=on&d=on&geo=pos&latitude=" +
            this.lat + "&longitude=" + this.long;
        this.log.info(url);
        return url;
    }

    isAfterDate(date, isAfter) {
        return date >= isAfter;
    }

    isAfterToday(date) {
        return this.isAfterDate(date, this.today)
    }

    getCurChodesh() {
        const today = this.today;
        const items = this.cal;
        // this.log.info(JSON.stringify(items));

        // Candle lighting and Havdallah
        const itemsAfterNow = items.filter(item => this.isAfterToday(new Date(item["date"])));
        const itemsBeforeNow = items.filter(item => !this.isAfterToday(new Date(item["date"])));

        const havdallahItemsAfterNow = itemsAfterNow.filter(item => item["title"].includes("Havdalah:"));
        const havdallahItemsBeforeNow = itemsBeforeNow.filter(item => item["title"].includes("Havdalah:"));

        const nextHavdallahDate = new Date(havdallahItemsAfterNow[0]["date"]);
        const prevHavdallahDate = new Date(havdallahItemsBeforeNow[havdallahItemsBeforeNow.length - 1]["date"]);
        const candleLightings = items.filter(item => {
            if (item["category"] !== "candles") {
                return false;
            }

            const itemDate = new Date(item["date"]);

            return this.isAfterDate(itemDate, prevHavdallahDate) &&
                this.isAfterDate(nextHavdallahDate, itemDate);
        });

        const firstCandleLightingDate = new Date(candleLightings[0]["date"]);
        const memo = candleLightings[0]["memo"];
        this.log.info(candleLightings[0]);

        if (this.isAfterToday(firstCandleLightingDate)) {
            return "";
        }

        if (memo != null) {
            return memo;
        }

        return "shab";
    }

    updateJewishDay() {
        if (this.cal == null) {
            axios
                .get(this.makeUrl())
                .then(res => {
                    this.cal = res.data["items"];
                    this.addNextYearIfNeeded();
                    this.updateSensors();
                })
                .catch(error => {
                    this.log.error(error);
                });
        } else {
            this.addNextYearIfNeeded();
            this.updateSensors();
        }
    }

    addNextYearIfNeeded() {
        const lastDateInCal = new Date(this.cal[this.cal.length - 1]["date"]);
        // If within 7 days...
        if ((lastDateInCal.getTime() - this.today.getTime()) / (1000 * 3600 * 24) <= 7) {
            axios
                .get(this.makeUrl(this.today.getFullYear() + 1))
                .then(res => {
                    this.cal.concat(res.data["items"]);
                    this.updateSensors();
                })
                .catch(error => {
                    this.log.error(error);
                });
        }
    }

    updateLoop() {
        // this.today = new Date();
        this.today = new Date("2024-10-02T18:57:00-04:00");
        
        this.updateJewishDay();
        setTimeout(this.updateLoop.bind(this), 10000);
    }

    isToday(date) {
        const today = this.today;
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    }

    checkChodesh(chodeshKey) {
        const cur = this.getCurChodesh();
        const ret = (chodeshKey === "shab")
            ? cur === chodeshKey
            : cur.includes(chodeshKey);
        if (ret) {
            this.log.info("is " + chodeshKey);
        }
        return ret;
    }

    checkHoliday(key) {
        const todayItems = this.cal.filter(e => this.isToday(new Date(e["date"])));
        const isHolidayCenter = todayItems.some(e => e.title.includes(key) && !e.title.includes("Erev"));
        const todayHasHavdallah = todayItems.some(e => e["category"] === "havdalah");

        // The second part of the or statement here makes sure to exclude final days of chag (since
        // that's being checked by checking chodesh)
        const ret = this.getCurChodesh().includes(key) || (isHolidayCenter && !todayHasHavdallah);
        if (ret) {
            this.log.info("is " + key + "(holiday)");
        }
        return ret;
    }

    checkTodayBasic(key) {
        const todayItems = this.cal.filter(e => this.isToday(new Date(e["date"])));
        const ret = todayItems.some(e => e.title.includes(key));
        if (ret) {
            this.log.info("is " + key + "(basic)");
        }
        return ret;
    }

    getChagFirstCandleLighting(key) {
        return this.cal.filter(e => e["category"] === "candles" && e["memo"] != null &&
            e["memo"].includes(key))[0];
    }

    getHebrewDate(date) {
        return this.cal.filter(e => {
            const eDate = new Date(e["date"]);
            return e["category"] === "hebdate" &&
                eDate.getDate() === date.getDate() &&
                eDate.getFullYear() === date.getFullYear() &&
                eDate.getMonth() === date.getMonth();
        })[0];
    }

    getEnglishDate(hebrewDate) {
        return new Date(this.cal.filter(e => e["category"] === "hebdate" &&
            e["hdate"].includes(hebrewDate))[0]["date"]);
    }

    isShabbat() {
        return this.checkChodesh("shab");
    }

    isRoshHashana() {
        return this.checkChodesh("Rosh Hashana");
    }
    isYomKippur() {
        return this.checkChodesh("Yom Kippur");
    }
    isSukkot() {
        return this.checkHoliday("Sukkot");
    }
    _isSukkotYomTov() {
        return this.checkChodesh("Sukkot");
    }
    isSheminiAtzeret() {
        return this.checkChodesh("Shmini Atzeret");
    }
    isPesach() {
        return this.checkHoliday("Pesach");
    }
    isThreeWeeks() {
        const start = this.getEnglishDate("17 Tamuz");
        const end = this.getEnglishDate("10 Av");
        const ret = this.isAfterDate(this.today, start) &&
            this.isAfterDate(end, this.today);
        if (ret) {
            this.log.info("is three weeks");
        }
        return ret;
    }

    _isPesachYomTov() {
        return this.checkChodesh("Pesach");
    }
    isOmer() {
        return this.checkTodayBasic("day of the Omer");
    }
    isMourning() {
        return this.isOmer() || this.isThreeWeeks();
    }

    isShavuot() {
        return this.checkChodesh("Shavuot");
    }
    isYomTov() {
        var holidays = this.isRoshHashana() || this.isYomKippur() || this._isSukkotYomTov() ||
            this.isSheminiAtzeret() || this._isPesachYomTov() || this.isShavuot();
        return holidays;
    }
    isKodesh() {
        return (this.isShabbat() || this.isYomTov());
    }

    isChanukah() {
        // TODO: get more specific end date
        const start = this.cal.filter(e => e["title"] === "Chanukah: 1 Candle");
        const end = this.cal.filter(e => e["title"] === "Chanukah: 8th Day");
        const ret = this.isAfterDate(this.today, new Date(start["date"])) &&
            this.isAfterDate(new Date(end["date"]), this.today);
        if (ret) {
            this.log.info("is chanukah");
        }
        return ret;
    }
}
