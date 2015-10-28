'use strict';
(function ( window ) {
    var boildb = window.boildb,
        describe = window.describe, 
        it = window.it,
        runs = window.runs,
        waitsFor = window.waitsFor,
        expect = window.expect,
        beforeEach = window.beforeEach,
        afterEach = window.afterEach,
        expect = window.expect;
    
    describe("indexdb.js", function() {
        describe("Dependancy check", function() {

          it("indexedDB working", function() {
              var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
              expect(indexedDB).toBeDefined();
          });
        
          describe("Promise working", function() {

              var promiseResolve = null,
                  promiseReject = null;
              
              beforeEach(function(done) {
                  
                  promiseResolve = new Promise(function(resolve,reject){
                                      resolve(1);
                                  });
                  
                  promiseReject = new Promise(function(resolve,reject){
                                      reject(-1); //causing error in console????Uncaught (in promise) -1
                                    });
                  done();
              });

              it("Promise is defined", function(done) {
                  //console.log('Promise',promiseResolve,promiseReject);
                  expect(promiseResolve).toBeDefined();
                  expect(promiseReject).toBeDefined();
                  
                  done();
              });

              it("Promise is resolving properly", function(done) {
                  promiseResolve.then(function(val){//success
                      expect(val).toEqual(1);
                      done();
                  }).catch(function(val){
                        fail('Promise resolving should not run');
                        done();
                  });
              });

              it("Promise is rejecting properly", function(done) {
                  promiseReject.then(function(val){
                    fail('Promise rejecting should not run');
                  }).catch(function(val){
                        expect(val).toEqual(-1);
                        done();
                  });
              });
          });
            
          it("boildb defined", function() {
              expect(boildb).toBeDefined();
          });
            
        });//Dependancy check
        
        it( 'error passed when schema is not defined' , function (done) {
                
            boildb.Open().catch(function ( status ) {
                expect( status ).toEqual('schema is not defined'); 
                done();
            });
        });
        
        describe("Boildb check", function() {
            //https://github.com/joshtronic/holidayapi.com
            //https://github.com/aaronpowell/db.js/blob/master/tests/specs/indexes.js
//            var hoildays = [
//                    {
//                    "name": "Last Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-01-01"
//                    },
//                    {
//                    "name": "New Year's Day",
//                    "country": "US",
//                    "date": "2015-01-01"
//                    },
//                    {
//                    "name": "Epiphany",
//                    "country": "US",
//                    "date": "2015-01-06"
//                    },
//                    {
//                    "name": "Orthodox Christmas",
//                    "country": "US",
//                    "date": "2015-01-07"
//                    },
//                    {
//                    "name": "Martin Luther King, Jr. Day",
//                    "country": "US",
//                    "date": "2015-01-19"
//                    }, 
//                    {
//                    "name": "Groundhog Day",
//                    "country": "US",
//                    "date": "2015-02-02"
//                    },
//                    {
//                    "name": "Valentine's Day",
//                    "country": "US",
//                    "date": "2015-02-14"
//                    },{
//                    "name": "Washington's Birthday",
//                    "country": "US",
//                    "date": "2015-02-16"
//                    },{
//                    "name": "Ash Wednesday",
//                    "country": "US",
//                    "date": "2015-02-18"
//                    },{
//                    "name": "International Women's Day",
//                    "country": "US",
//                    "date": "2015-03-08"
//                    }, {
//                    "name": "Saint Patrick's Day",
//                    "country": "US",
//                    "date": "2015-03-17"
//                    }
//                    , {
//                    "name": "Palm Sunday",
//                    "country": "US",
//                    "date": "2015-03-29"
//                    }
//                    ,
//                    {
//                    "name": "April Fools' Day",
//                    "country": "US",
//                    "date": "2015-04-01"
//                    }
//                    ,
//                    {
//                    "name": "Good Friday",
//                    "country": "US",
//                    "date": "2015-04-03"
//                    }
//                    ,
//                    {
//                    "name": "Easter",
//                    "country": "US",
//                    "date": "2015-04-05"
//                    }
//                    ,
//                    {
//                    "name": "Earth Day",
//                    "country": "US",
//                    "date": "2015-04-22"
//                    }
//                    ,
//                    {
//                    "name": "Arbor Day",
//                    "country": "US",
//                    "date": "2015-04-24"
//                    }
//                    ,
//                    {
//                    "name": "May Day",
//                    "country": "US",
//                    "date": "2015-05-01"
//                    }
//                    ,
//                    {
//                    "name": "Star Wars Day",
//                    "country": "US",
//                    "date": "2015-05-04"
//                    }
//                    ,
//                    {
//                    "name": "Cinco de Mayo",
//                    "country": "US",
//                    "date": "2015-05-05"
//                    }
//                    ,
//                    {
//                    "name": "Mother's Day",
//                    "country": "US",
//                    "date": "2015-05-10"
//                    }
//                    ,
//                    {
//                    "name": "Memorial Day",
//                    "country": "US",
//                    "date": "2015-05-25"
//                    }
//                    ,
//                    {
//                    "name": "Flag Day",
//                    "country": "US",
//                    "date": "2015-06-14"
//                    }
//                    ,
//                    {
//                    "name": "Father's Day",
//                    "country": "US",
//                    "date": "2015-06-21"
//                    }
//                    ,
//                    {
//                    "name": "Helen Keller Day",
//                    "country": "US",
//                    "date": "2015-06-27"
//                    }
//                    ,
//                    {
//                    "name": "Independence Day",
//                    "country": "US",
//                    "date": "2015-07-04"
//                    }
//                    ,
//                    {
//                    "name": "Women's Equality Day",
//                    "country": "US",
//                    "date": "2015-08-26"
//                    }
//                    ,
//                    {
//                    "name": "Labor Day",
//                    "country": "US",
//                    "date": "2015-09-07"
//                    }
//                    ,
//                    {
//                    "name": "Patriot Day",
//                    "country": "US",
//                    "date": "2015-09-11"
//                    }
//                    ,
//                    {
//                    "name": "Grandparent's Day",
//                    "country": "US",
//                    "date": "2015-09-13"
//                    }
//                    ,
//                    {
//                    "name": "Constitution Day",
//                    "country": "US",
//                    "date": "2015-09-17"
//                    }
//                    ,
//                    {
//                    "name": "German-American Day",
//                    "country": "US",
//                    "date": "2015-10-06"
//                    }
//                    ,
//                    {
//                    "name": "Leif Erkson Day",
//                    "country": "US",
//                    "date": "2015-10-09"
//                    }
//                    ,
//                    {
//                    "name": "Columbus Day",
//                    "country": "US",
//                    "date": "2015-10-12"
//                    }
//                    ,
//                    {
//                    "name": "Halloween",
//                    "country": "US",
//                    "date": "2015-10-31"
//                    }
//                    ,
//                    {
//                    "name": "Election Day",
//                    "country": "US",
//                    "date": "2015-11-03"
//                    }
//                    ,
//                    {
//                    "name": "Veterans Day",
//                    "country": "US",
//                    "date": "2015-11-11"
//                    }
//                    ,
//                    {
//                    "name": "Thanksgiving Day",
//                    "country": "US",
//                    "date": "2015-11-26"
//                    }
//                    ,
//                    {
//                    "name": "Black Friday",
//                    "country": "US",
//                    "date": "2015-11-27"
//                    }
//                    ,
//                    {
//                    "name": "Pearl Harbor Remembrance Day",
//                    "country": "US",
//                    "date": "2015-12-07"
//                    }
//                    ,
//                    {
//                    "name": "Immaculate Conception of the Virgin Mary",
//                    "country": "US",
//                    "date": "2015-12-08"
//                    }
//                    ,
//                    {
//                    "name": "Christmas Eve",
//                    "country": "US",
//                    "date": "2015-12-24"
//                    }
//                    ,
//                    {
//                    "name": "Christmas",
//                    "country": "US",
//                    "date": "2015-12-25"
//                    }
//                    ,
//                    {
//                    "name": "First Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-26"
//                    }
//                    ,
//                    {
//                    "name": "Second Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-27"
//                    }
//                    ,
//                    {
//                    "name": "Third Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-28"
//                    }
//                    ,
//                    {
//                    "name": "Fourth Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-29"
//                    }
//                    ,
//                    {
//                    "name": "Fifth Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-30"
//                    }
//                    ,
//                    {
//                    "name": "New Year's Eve",
//                    "country": "US",
//                    "date": "2015-12-31"
//                    },
//                    {
//                    "name": "Sixth Day of Kwanzaa",
//                    "country": "US",
//                    "date": "2015-12-31"
//                    }
//            ];
            var dbName = 'testDB';
            function specDeleteDatabase(spec, done){
                var req = indexedDB.deleteDatabase( dbName );

                req.onsuccess = function () {
                    console.log( 'db delete success' );
                    done();
                };

                req.onerror = function () {
                    console.log( 'failed to delete db in beforeEach' , arguments );
                    done();
                };

                req.onblocked = function () {
                    console.log( 'db blocked' , arguments , spec );
                    done();
                };
            }
            //clear db before each 'it'
            beforeEach(function (done) {
                var spec = this;
                if(boildb._db !==null)
                      boildb._db.close();
                console.log('beforeEach');
                specDeleteDatabase(spec, done);
            });
            
            it( 'should allow creating dbs with stores' , function (done) {
                //call boildb API to test
                boildb.schema = {
                    "dbName"   : dbName,
                    "version"  :1,
                    "stores"   :[{ 
                                    "name":"test0"
                                 },
                                 { 
                                    "name":"test1",
                                    "autoIncrement":true,
                                 },
                                 { 
                                    "name":"test2",
                                    "primaryField":"field1",
                                 }
                                ]
                };
                
                boildb.Open().then(function ( status ) {
                    if(boildb._db !==null)
                      boildb._db.close();
                    console.log('open status ',status);
                    var req = indexedDB.open( dbName , 1 );
                    req.onsuccess = function ( e ) {
                        var db = e.target.result;
                        var storeList = db.objectStoreNames;
                        var StoreNames = Array.prototype.slice.call( storeList );
                        console.log(StoreNames);
                        expect( storeList.length ).toEqual( 3 );
                        expect( StoreNames ).toContain( 'test0' );
                        expect( StoreNames ).toContain( 'test1' );
                        expect( StoreNames ).toContain( 'test2' );
                        db.close();
                        done();
                    };
                });
            });
            
            it( 'should allow creating dbs with stores2' , function (done) {
                //call boildb API to test
                boildb.schema = {
                    "dbName"   : dbName,
                    "version"  :1,
                    "stores"   :[{ 
                                    "name":"test0"
                                 },
                                 { 
                                    "name":"test1",
                                    "autoIncrement":true,
                                 },
                                 { 
                                    "name":"test2",
                                    "primaryField":"field1",
                                 }
                                ]
                };
                
                boildb.Open().then(function ( status ) {
                  if(boildb._db !==null)
                    boildb._db.close();
                    console.log('open status ', status);
                    var req = indexedDB.open( dbName , 1 );
                    req.onsuccess = function ( e ) {
                        var db = e.target.result;
                        var storeList = db.objectStoreNames;
                        var StoreNames = Array.prototype.slice.call( storeList );
                        console.log(StoreNames);
                        expect( storeList.length ).toEqual( 3 );
                        expect( StoreNames ).toContain( 'test0' );
                        expect( StoreNames ).toContain( 'test1' );
                        expect( StoreNames ).toContain( 'test2' );
                        db.close();
                        done();
                    };
                });
            });
        });//Boildb check
    });//indexdb.js
        
})(window);
   