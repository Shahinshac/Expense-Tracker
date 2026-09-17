from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.models.models import User, Category, Expense
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).filter(
        or_(Category.user_id == current_user.id, Category.user_id == None)
    ).order_by(Category.group.asc(), Category.name.asc()).all()
    return [CategoryResponse.model_validate(c) for c in categories]

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if duplicate name in user's categories
    existing = db.query(Category).filter(
        Category.name.ilike(cat_in.name.strip()),
        or_(Category.user_id == current_user.id, Category.user_id == None)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A category with this name already exists.")

    category = Category(
        user_id=current_user.id,
        name=cat_in.name.strip(),
        group=cat_in.group or "Personal",
        icon=cat_in.icon or "tag",
        color=cat_in.color or "#6366f1",
        is_default=False
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: int,
    cat_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == id, Category.user_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or cannot be modified")

    if cat_in.name is not None:
        category.name = cat_in.name.strip()
    if cat_in.group is not None:
        category.group = cat_in.group
    if cat_in.icon is not None:
        category.icon = cat_in.icon
    if cat_in.color is not None:
        category.color = cat_in.color

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_category(
    id: int,
    reassign_to_category_id: Optional[int] = Query(None, description="Category to transfer existing expenses to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == id, Category.user_id == current_user.id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or cannot be deleted")

    # Check for associated expenses
    expense_count = db.query(Expense).filter(Expense.category_id == id).count()
    if expense_count > 0:
        if not reassign_to_category_id:
            raise HTTPException(
                status_code=400,
                detail=f"Category has {expense_count} associated expenses. Please select another category to reassign them to before deleting."
            )
        
        target_cat = db.query(Category).filter(
            Category.id == reassign_to_category_id,
            or_(Category.user_id == current_user.id, Category.user_id == None)
        ).first()
        if not target_cat or target_cat.id == id:
            raise HTTPException(status_code=400, detail="Invalid target category for reassignment.")

        # Reassign expenses
        db.query(Expense).filter(Expense.category_id == id).update(
            {"category_id": target_cat.id},
            synchronize_session="fetch"
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully", "reassigned_count": expense_count}
