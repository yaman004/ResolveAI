import mongoose from 'mongoose';

// Consistent JSON shape for every model: `_id` becomes `id`, `__v` is dropped.
mongoose.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    return ret;
  },
});
