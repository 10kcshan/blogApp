'use strict';

const _ = require('lodash');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const utils = require('../common/utils');
const config = require('../common/config');

const User = require('./user.model');

const AuthController = {};

const CreateUserFields = [
    'username',
    'password'
];
const LoginUserFields = [
    'username',
    'password'
];

const saltRounds = 10;
const tokenDuration = 1440; // essentially 24h

function createUserInDB(body) {
    const user = new User(body);
    return user.save();
}

function verifyUserInDB(user) {
    return new Promise((resolve, reject) => {
        const query = User.findOne({ 'username': user.username });
        query.select('username password');
        query.exec((err, userInDB) => {
            if (userInDB) {
                if (user.password != userInDB.password) {
                    reject("Passwords do not match");
                } else {
                    resolve(user);
                }
                // bcrypt.compare(user.password, userInDB.password, (err, result) => {
                //     if (result) {
                //         resolve(user);
                //     } else {
                //         reject("Passwords do not match");
                //     }
                // });
            } else {
                reject("User not found in database");
            }
        });
    });
}

function hashPassword(body) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(body.password, saltRounds, (err, hash) => {
            if (err) {
                reject(err);
            } else {
                body.password = hash;
                resolve(body);
            }
        });
    });
}

function generateJWT(user) {
    return new Promise((resolve, reject) => {
        const token = jwt.sign(user, config.secret, {
            expiresIn: tokenDuration // expires in 24h
        });
        resolve(token);
    });
}

AuthController.register = function (req, res, next) {
    // All this will do is create a user with the following credentials:
    // USER: password
    // PASS: username

    const testUser = {
        username: "password",
        password: "username"
    };

    // let data = req.body.data;
    let data = testUser;

    utils.extractFields(data, CreateUserFields)
        // .then(hashPassword)
        .then(createUserInDB)
        .then((user) => {
            res.status(201).send({
                data: [{
                    id: user.id,
                    username: user.username,
                    created_at: user.created_at
                }]
            });
        })
        .catch((err) => {
            res.status(400).send({
                errors: [{
                    title: "User could not be created",
                    detail: err.toString()
                }]
            })
        })
};

AuthController.login = function (req, res, next) {
    const data = req.body.data;

    utils.extractFields(data, LoginUserFields)
        // .then(hashPassword)
        .then(verifyUserInDB)
        .then(generateJWT)
        .then((token) => {
            res.status(200).send({
                data: [{
                    token: token
                }]
            });
        })
        .catch((err) => {
            res.status(403).send({
                errors: [{
                    title: "User could not be authenticated",
                    detail: err.toString()
                }]
            })
        })
};

module.exports = AuthController;
