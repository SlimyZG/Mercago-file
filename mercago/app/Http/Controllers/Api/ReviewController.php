<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * POST /api/reviews
     * Add a review for a product or a vendor.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
            'vendor_id' => ['nullable', 'exists:users,id'],
        ]);

        if (empty($validated['product_id']) && empty($validated['vendor_id'])) {
            return response()->json(['message' => 'Must provide either product_id or vendor_id.'], 422);
        }

        $validated['user_id'] = $request->user()->id;

        $review = Review::create($validated);

        return response()->json([
            'message' => 'Review submitted successfully!',
            'review' => $review->load('user'),
        ], 201);
    }

    /**
     * GET /api/vendor/reviews
     * Vendor views their own reviews and ratings.
     */
    public function vendorReviews(Request $request)
    {
        $vendor = $request->user();
        if ($vendor->role !== 'vendor') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reviews = Review::where('vendor_id', $vendor->id)
            ->with('user')
            ->latest()
            ->get();

        $avgRating = $reviews->avg('rating');

        return response()->json([
            'avg_rating' => round((float) $avgRating, 1),
            'reviews' => $reviews,
        ]);
    }
}
