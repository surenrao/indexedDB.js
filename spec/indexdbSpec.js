'use strict';
(function (window) {
    var boildb = window.boildb,
        describe = window.describe,
        it = window.it,
        runs = window.runs,
        waitsFor = window.waitsFor,
        expect = window.expect,
        beforeEach = window.beforeEach,
        afterEach = window.afterEach,
        expect = window.expect,
        jasmine = window.jasmine;

    describe("indexdb.js", function () {
        describe("Dependancy check", function () {

            it("indexedDB working", function () {
                var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
                expect(indexedDB).toBeDefined();
            });//it

            describe("Promise working", function () {

                var promiseResolve = null,
                    promiseReject = null;

                beforeEach(function (done) {
                    promiseResolve = Promise.resolve(1);
                    promiseReject = Promise.reject(-1);

                    done();
                });

                it("Promise is defined", function (done) {
                    //console.log('Promise',promiseResolve,promiseReject);
                    expect(promiseResolve).toBeDefined();
                    expect(promiseReject).toBeDefined();

                    done();
                });//it

                it("Promise is resolving properly", function (done) {
                    promiseResolve.then(function (val) {//success
                        expect(val).toEqual(1);
                        done();
                    }).catch(function (val) {
                        fail('Promise resolving should not run');
                        done();
                    });
                });//it

                it("Promise is rejecting properly", function (done) {
                    promiseReject.then(function (val) {
                        fail('Promise rejecting should not run');
                    }).catch(function (val) {
                        expect(val).toEqual(-1);
                        done();
                    });
                });//it
            });//describe

            it("boildb defined", function () {
                expect(boildb).toBeDefined();
            });//it

        });//Dependancy check
        
        describe("Boildb check", function () {
            var dbName = 'testDB';
            function specDeleteDatabase(spec, done) {
                var req = indexedDB.deleteDatabase(dbName);

                req.onsuccess = function () {
                    console.log('db delete success');
                    done();
                };

                req.onerror = function () {
                    console.log('failed to delete db in beforeEach', arguments);
                    done();
                };

                req.onblocked = function () {
                    console.log('db blocked', arguments, spec);
                    done();
                };
            }
            //clear db before each 'it'
            beforeEach(function (done) {
                var spec = this;
                console.log('beforeEach');
                boildb.Dispose();
                specDeleteDatabase(spec, done);
                //done();
            });

            afterEach(function (done) {
                var spec = this;
                console.log('afterEach');
                specDeleteDatabase(spec, done);
                //done();
            });
            
            it("if indexedDB not working, show error", function (done) {
                boildb.global.indexedDB = null;
                boildb.Open({
                        "dbName": "testDB",
                        "version": 1,
                        "stores": [{
                            "name": "test0"
                        }]
                }).then(function(){
                    console.log('inside then, should not happen');
                    fail('should throw an Error.');
                    boildb.Close();
                    boildb.global.indexedDB = window.indexedDB;
                    done();
                }).catch(function (error) {
                    console.log('inside catch', error);
                    expect(error).toEqual(new Error('Current browser does not suppport indexedDB.'));
                    boildb.Close();
                    boildb.global.indexedDB = window.indexedDB;
                    done();
                });     
            });//it

            it('error passed when schema is not defined', function (done) {
                console.log('error passed when schema is not defined');
                boildb.Open().then(function(){
                    console.log('inside then, should not happen');
                    fail('should throw an Error.');
                    boildb.Close();
                    done();
                })
                .catch(function (error) {
                    console.log('inside catch 2', error);
                    expect(error).toEqual(new Error('schema is not defined'));
                    boildb.Close();
                    done();
                });
            });//it

            it('should allow creating dbs with stores', function (done) {
                //call boildb API to test
                var schema = {
                    "dbName": dbName,
                    "version": 1,
                    "stores": [{
                        "name": "test0"
                    },
                        {
                            "name": "test1",
                            "autoIncrement": true,
                        },
                        {
                            "name": "test2",
                            "primaryField": "field1",
                        }
                    ]
                };

                boildb.Open(schema).then(function (status) {
                    boildb.Close();

                    var req = indexedDB.open(dbName, 1);
                    req.onsuccess = function (e) {
                        var db = e.target.result;
                        var storeList = db.objectStoreNames;
                        var StoreNames = Array.prototype.slice.call(storeList);
                        console.log(StoreNames);
                        expect(storeList.length).toEqual(3);
                        expect(StoreNames).toContain('test0');
                        expect(StoreNames).toContain('test1');
                        expect(StoreNames).toContain('test2');
                        db.close();
                        done();
                    };
                });
            });//it

            it('should allow creating dbs with indexes', function (done) {
                //call boildb API to test
                var schema = {
                    "dbName": dbName,
                    "version": 1,
                    "stores": [{
                        "name": "test0",
                        "indexes": [{
                            "name": "idxTest1",
                            "field": "keyid"
                        }, {
                                "name": "idxTest2",
                                "field": "desc"
                            }]
                    }]
                };

                boildb.Open(schema).then(function (status) {
                    boildb.Close();

                    var req = indexedDB.open(dbName, 1);
                    req.onsuccess = function (e) {
                        var db = e.target.result;
                        var transaction = db.transaction('test0');
                        var store = transaction.objectStore('test0');
                        var indexNames = Array.prototype.slice.call(store.indexNames);
                        //to avoid blocks, if transaction is involed,then close db after onclomplete
                        transaction.oncomplete = function (event) {
                            expect(indexNames.length).toEqual(2);
                            expect(indexNames).toContain('idxTest1');
                            expect(indexNames).toContain('idxTest2');
                            db.close();
                            done();
                        }
                    };
                });
            });//it

            it('should allow adding indexes to an existing object store', function (done) {
                //call boildb API to test
                var schema = {
                    "dbName": dbName,
                    "version": 1,
                    "stores": [{
                        "name": "test0"
                    }]
                };

                //will create db and return 1
                boildb.Open(schema).then(function (status) {
                    console.log('opened', status);
                    var schema2 = {
                        "dbName": dbName,
                        "version": 2,
                        "stores": [{
                            "name": "test0",
                            "indexes": [{
                                "name": "idxTest1",
                                "field": "keyid"
                            }, {
                                    "name": "idxTest2",
                                    "field": "desc"
                                }]
                        }],
                        "revisions": {
                            '0': {
                                "stores": [{
                                    "name": "test0",
                                    "indexes": [{
                                        "name": "idxTest1",
                                        "field": "keyid"
                                    }, {
                                            "name": "idxTest2",
                                            "field": "desc"
                                        }]
                                }]
                            },
                            '1': {
                                "stores": []
                            }
                        }
                    };
                    return boildb.Open(schema2);
                })
                    .then(function (status) {
                        boildb.Close();
                        console.log('status', status);

                        var req = indexedDB.open(dbName, 2);
                        req.onsuccess = function (e) {
                            var db = e.target.result;
                            var transaction = db.transaction('test0');
                            var store = transaction.objectStore('test0');
                            var indexNames = Array.prototype.slice.call(store.indexNames);
                            //to avoid blocks, if transaction is involed,then close db after onclomplete
                            transaction.oncomplete = function (event) {
                                expect(indexNames.length).toEqual(2);
                                expect(indexNames).toContain('idxTest1');
                                expect(indexNames).toContain('idxTest2');
                                db.close();
                                done();
                            }
                        };
                    }).catch(function (err) {
                        console.error(err); // Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.
                    });
            });//it
        });//describe Boildb check

    });//indexdb.js

})(window);
