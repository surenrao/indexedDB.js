//https://github.com/joshtronic/holidayapi.com
//https://github.com/aaronpowell/db.js/blob/master/tests/specs/indexes.js
var hoildays = [
        {
        "name": "Last Day of Kwanzaa",
        "country": "US",
        "date": "2015-01-01"
        },
        {
        "name": "New Year's Day",
        "country": "US",
        "date": "2015-01-01"
        },
        {
        "name": "Epiphany",
        "country": "US",
        "date": "2015-01-06"
        },
        {
        "name": "Orthodox Christmas",
        "country": "US",
        "date": "2015-01-07"
        },
        {
        "name": "Martin Luther King, Jr. Day",
        "country": "US",
        "date": "2015-01-19"
        }, 
        {
        "name": "Groundhog Day",
        "country": "US",
        "date": "2015-02-02"
        },
        {
        "name": "Valentine's Day",
        "country": "US",
        "date": "2015-02-14"
        },{
        "name": "Washington's Birthday",
        "country": "US",
        "date": "2015-02-16"
        },{
        "name": "Ash Wednesday",
        "country": "US",
        "date": "2015-02-18"
        },{
        "name": "International Women's Day",
        "country": "US",
        "date": "2015-03-08"
        }, {
        "name": "Saint Patrick's Day",
        "country": "US",
        "date": "2015-03-17"
        }
        , {
        "name": "Palm Sunday",
        "country": "US",
        "date": "2015-03-29"
        }
        ,
        {
        "name": "April Fools' Day",
        "country": "US",
        "date": "2015-04-01"
        }
        ,
        {
        "name": "Good Friday",
        "country": "US",
        "date": "2015-04-03"
        }
        ,
        {
        "name": "Easter",
        "country": "US",
        "date": "2015-04-05"
        }
        ,
        {
        "name": "Earth Day",
        "country": "US",
        "date": "2015-04-22"
        }
        ,
        {
        "name": "Arbor Day",
        "country": "US",
        "date": "2015-04-24"
        }
        ,
        {
        "name": "May Day",
        "country": "US",
        "date": "2015-05-01"
        }
        ,
        {
        "name": "Star Wars Day",
        "country": "US",
        "date": "2015-05-04"
        }
        ,
        {
        "name": "Cinco de Mayo",
        "country": "US",
        "date": "2015-05-05"
        }
        ,
        {
        "name": "Mother's Day",
        "country": "US",
        "date": "2015-05-10"
        }
        ,
        {
        "name": "Memorial Day",
        "country": "US",
        "date": "2015-05-25"
        }
        ,
        {
        "name": "Flag Day",
        "country": "US",
        "date": "2015-06-14"
        }
        ,
        {
        "name": "Father's Day",
        "country": "US",
        "date": "2015-06-21"
        }
        ,
        {
        "name": "Helen Keller Day",
        "country": "US",
        "date": "2015-06-27"
        }
        ,
        {
        "name": "Independence Day",
        "country": "US",
        "date": "2015-07-04"
        }
        ,
        {
        "name": "Women's Equality Day",
        "country": "US",
        "date": "2015-08-26"
        }
        ,
        {
        "name": "Labor Day",
        "country": "US",
        "date": "2015-09-07"
        }
        ,
        {
        "name": "Patriot Day",
        "country": "US",
        "date": "2015-09-11"
        }
        ,
        {
        "name": "Grandparent's Day",
        "country": "US",
        "date": "2015-09-13"
        }
        ,
        {
        "name": "Constitution Day",
        "country": "US",
        "date": "2015-09-17"
        }
        ,
        {
        "name": "German-American Day",
        "country": "US",
        "date": "2015-10-06"
        }
        ,
        {
        "name": "Leif Erkson Day",
        "country": "US",
        "date": "2015-10-09"
        }
        ,
        {
        "name": "Columbus Day",
        "country": "US",
        "date": "2015-10-12"
        }
        ,
        {
        "name": "Halloween",
        "country": "US",
        "date": "2015-10-31"
        }
        ,
        {
        "name": "Election Day",
        "country": "US",
        "date": "2015-11-03"
        }
        ,
        {
        "name": "Veterans Day",
        "country": "US",
        "date": "2015-11-11"
        }
        ,
        {
        "name": "Thanksgiving Day",
        "country": "US",
        "date": "2015-11-26"
        }
        ,
        {
        "name": "Black Friday",
        "country": "US",
        "date": "2015-11-27"
        }
        ,
        {
        "name": "Pearl Harbor Remembrance Day",
        "country": "US",
        "date": "2015-12-07"
        }
        ,
        {
        "name": "Immaculate Conception of the Virgin Mary",
        "country": "US",
        "date": "2015-12-08"
        }
        ,
        {
        "name": "Christmas Eve",
        "country": "US",
        "date": "2015-12-24"
        }
        ,
        {
        "name": "Christmas",
        "country": "US",
        "date": "2015-12-25"
        }
        ,
        {
        "name": "First Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-26"
        }
        ,
        {
        "name": "Second Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-27"
        }
        ,
        {
        "name": "Third Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-28"
        }
        ,
        {
        "name": "Fourth Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-29"
        }
        ,
        {
        "name": "Fifth Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-30"
        }
        ,
        {
        "name": "New Year's Eve",
        "country": "US",
        "date": "2015-12-31"
        },
        {
        "name": "Sixth Day of Kwanzaa",
        "country": "US",
        "date": "2015-12-31"
        }
];