const assert = require('assert');
const app = require('../server.js');
const request = require('supertest')(app);

describe('User cycle operations', () => {
    // wait for the database
    before((done) => {
        setTimeout(() => {
            done();
        }, 5000);
    });
});

// Shut down gracefully
after((done) => {
    app.db.client.close();
    app.node2.kill();
    app.close(done);
});

// Register a new user
it("should create a new registered User", (done) => {
    request.post("/api/users")
        .send({
            email: 'bsam@sample.com',
            displayName: 'Bussher',
            password: 'abc123'
        })
        .end((err, res) => {
            assert.equal(res.status, 201);
            assert.equal(res.body.displayName, "Bussher", "Name of user should be as set");
            done();
        });
});