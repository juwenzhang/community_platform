//! `SeaORM` Entity — comments 表

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "comments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub article_id: Uuid,
    pub author_id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub content: String,
    pub parent_id: Option<Uuid>,
    pub reply_to_id: Option<Uuid>,
    pub mentions: Vec<String>,
    #[sea_orm(column_type = "JsonBinary")]
    pub media_attachments: serde_json::Value,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::articles::Entity",
        from = "Column::ArticleId",
        to = "super::articles::Column::Id",
        on_delete = "Cascade"
    )]
    Articles,
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::AuthorId",
        to = "super::users::Column::Id",
        on_delete = "NoAction"
    )]
    Users,
}

impl Related<super::articles::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Articles.def()
    }
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
