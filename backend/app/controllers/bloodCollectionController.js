const bloodCollectionModel = require('../models/bloodCollectionModel');
const donationModel = require('../models/donationModel');
const bloodUnitModel = require('../models/bloodUnitModel');

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_STATUSES = ['Pending', 'Safe', 'Rejected', 'Disposed', 'Withdrawn'];

const getAllCollections = async (req, res) => {
    try {
        const collections = await bloodCollectionModel.getAllCollections();
        res.status(200).json({
            status: 'success',
            count: collections.length,
            data: collections
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getCollectionById = async (req, res) => {
    try {
        const collection = await bloodCollectionModel
            .getCollectionById(req.params.id);
        if (!collection) {
            return res.status(404).json({
                status: 'error',
                message: 'Blood collection not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: collection
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getCollectionsByBranch = async (req, res) => {
    try {
        const collections = await bloodCollectionModel
            .getCollectionsByBranch(req.params.branch_id);
        res.status(200).json({
            status: 'success',
            count: collections.length,
            data: collections
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createCollection = async (req, res) => {
    try {
        const { donation_id, blood_type, component } = req.body;

        // Required fields
        if (!donation_id || !blood_type) {
            return res.status(400).json({
                status: 'error',
                message: 'donation_id and blood_type are required'
            });
        }

        // Validate blood type
        if (!VALID_BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`
            });
        }

        // Check donation exists
        const donation = await donationModel.getDonationById(donation_id);
        if (!donation) {
            return res.status(404).json({
                status: 'error',
                message: 'Donation not found'
            });
        }

        // Calculate expiration date
        const bloodComponent = component || 'Whole Blood';
        const expiryData = await bloodCollectionModel
            .getExpiryDays(bloodComponent);

        let expiration_date = null;
        if (expiryData) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + expiryData.expiry_days);
            expiration_date = expiry.toISOString().split('T')[0];
        }

        // Get collected_by from token
        const collected_by = req.user.user_id;

        const collection = await bloodCollectionModel.createCollection({
            ...req.body,
            collected_by,
            expiration_date,
            donor_id: donation.donor_id
        });

        res.status(201).json({
            status: 'success',
            message: 'Blood collection recorded successfully',
            data: collection
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateCollectionStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;

        // Validate status present
        if (!status) {
            return res.status(400).json({
                status: 'error',
                message: 'status is required'
            });
        }

        // Validate status value
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        // Rejection requires a reason
        if (status === 'Rejected' && !reason) {
            return res.status(400).json({
                status: 'error',
                message: 'reason is required when rejecting a blood collection'
            });
        }

        // Get collection details first
        const collection = await bloodCollectionModel
            .getCollectionById(req.params.id);

        if (!collection) {
            return res.status(404).json({
                status: 'error',
                message: 'Blood collection not found'
            });
        }

        // Prevent updating already processed collection
        if (collection.status !== 'Pending') {
            return res.status(400).json({
                status: 'error',
                message: `Cannot update. Collection is already ${collection.status}`
            });
        }

        // Update collection status
        const updated = await bloodCollectionModel
            .updateCollectionStatus(
                req.params.id,
                status,
                req.user.user_id,
                reason
            );

        let blood_unit = null;

        // Auto create blood unit if marked Safe
        if (status === 'Safe') {
            blood_unit = await bloodUnitModel.createUnit({
                collection_id: collection.collection_id,
                donation_id: collection.donation_id,
                donor_id: collection.donor_id,
                branch_id: collection.branch_id,
                blood_type: collection.blood_type,
                component: collection.component,
                volume_ml: collection.volume_ml,
                barcode: collection.barcode,
                collection_date: collection.collection_date,
                expiration_date: collection.expiration_date,
                processed_by: req.user.user_id
            });
        }

        res.status(200).json({
            status: 'success',
            message: `Blood collection marked as ${status}`,
            data: updated,
            blood_unit: blood_unit
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllCollections,
    getCollectionById,
    getCollectionsByBranch,
    createCollection,
    updateCollectionStatus
};