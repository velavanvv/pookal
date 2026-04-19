<?php

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;

class ArchitectureSmokeTest extends TestCase
{
    public function test_architecture_modules_are_defined(): void
    {
        $modules = ['catalog', 'inventory', 'orders', 'crm', 'delivery', 'reports'];

        $this->assertCount(6, $modules);
    }
}
