<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shopper_id');         // FK -> users (shopper)
            $table->uuid('vendor_id');          // FK -> users (vendor)
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->string('status')->default('completed'); // completed, cancelled
            $table->timestamps();

            $table->foreign('shopper_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('vendor_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');           // FK -> orders
            $table->uuid('product_id');         // FK -> products
            $table->string('product_name');     // snapshot at time of purchase
            $table->decimal('unit_price', 10, 2);   // snapshot at time of purchase
            $table->integer('quantity');
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
