//! DateTime ↔ prost Timestamp 转换

use prost_types::Timestamp;
use sea_orm::prelude::DateTimeWithTimeZone;

/// DateTimeWithTimeZone → prost Timestamp
pub fn datetime_to_timestamp(dt: DateTimeWithTimeZone) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

/// Option<DateTimeWithTimeZone> → Option<Timestamp>
pub fn optional_datetime_to_timestamp(dt: Option<DateTimeWithTimeZone>) -> Option<Timestamp> {
    dt.map(datetime_to_timestamp)
}
